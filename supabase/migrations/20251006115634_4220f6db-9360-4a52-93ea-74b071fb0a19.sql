-- Create enum for user roles
CREATE TYPE public.app_role AS ENUM ('donor', 'recipient', 'nonprofit');

-- Create enum for food listing status
CREATE TYPE public.listing_status AS ENUM ('available', 'claimed', 'expired');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  phone TEXT,
  location_lat NUMERIC(10, 8),
  location_lng NUMERIC(11, 8),
  address TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user_roles table (separate for security)
CREATE TABLE public.user_roles (
  id UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);

-- Create food_listings table
CREATE TABLE public.food_listings (
  id UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  donor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  food_type TEXT NOT NULL,
  quantity NUMERIC NOT NULL,
  quantity_unit TEXT NOT NULL,
  expiration_date TIMESTAMP WITH TIME ZONE NOT NULL,
  pickup_instructions TEXT,
  location_lat NUMERIC(10, 8) NOT NULL,
  location_lng NUMERIC(11, 8) NOT NULL,
  address TEXT NOT NULL,
  transportation_available BOOLEAN DEFAULT false,
  status listing_status NOT NULL DEFAULT 'available',
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.food_listings ENABLE ROW LEVEL SECURITY;

-- Create function to check if user has a specific role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- RLS Policies for profiles
CREATE POLICY "Users can view all profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- RLS Policies for user_roles
CREATE POLICY "Users can view all roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert own role"
  ON public.user_roles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for food_listings
CREATE POLICY "Anyone can view available food listings"
  ON public.food_listings FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Donors can create food listings"
  ON public.food_listings FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = donor_id AND
    public.has_role(auth.uid(), 'donor'::app_role)
  );

CREATE POLICY "Donors can update own listings"
  ON public.food_listings FOR UPDATE
  TO authenticated
  USING (auth.uid() = donor_id);

CREATE POLICY "Donors can delete own listings"
  ON public.food_listings FOR DELETE
  TO authenticated
  USING (auth.uid() = donor_id);

-- Create function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, phone, address)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'phone', ''),
    COALESCE(NEW.raw_user_meta_data->>'address', '')
  );
  RETURN NEW;
END;
$$;

-- Trigger to create profile on user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Triggers for automatic timestamp updates
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_food_listings_updated_at
  BEFORE UPDATE ON public.food_listings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for food listings
ALTER PUBLICATION supabase_realtime ADD TABLE public.food_listings;