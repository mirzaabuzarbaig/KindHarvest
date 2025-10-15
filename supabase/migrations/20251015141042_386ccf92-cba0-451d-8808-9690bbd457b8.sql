-- Extend profiles table with additional fields
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS contact_number text,
ADD COLUMN IF NOT EXISTS location_lat numeric,
ADD COLUMN IF NOT EXISTS location_lng numeric,
ADD COLUMN IF NOT EXISTS profile_image_url text;

-- Update profiles table to use existing phone as contact_number if not set
UPDATE public.profiles 
SET contact_number = phone 
WHERE contact_number IS NULL AND phone IS NOT NULL;

-- Extend food_listings table with additional fields
ALTER TABLE public.food_listings
ADD COLUMN IF NOT EXISTS food_name text,
ADD COLUMN IF NOT EXISTS category text CHECK (category IN ('Cooked', 'Packaged', 'Fresh', 'Bakery', 'Other')),
ADD COLUMN IF NOT EXISTS pickup_time timestamp with time zone;

-- Update existing food_listings to use title as food_name if not set
UPDATE public.food_listings 
SET food_name = title 
WHERE food_name IS NULL;

-- Update existing food_listings to use food_type as category if not set
UPDATE public.food_listings 
SET category = 
  CASE 
    WHEN food_type ILIKE '%cooked%' THEN 'Cooked'
    WHEN food_type ILIKE '%packaged%' THEN 'Packaged'
    WHEN food_type ILIKE '%fresh%' THEN 'Fresh'
    WHEN food_type ILIKE '%bakery%' THEN 'Bakery'
    ELSE 'Other'
  END
WHERE category IS NULL;

-- Create donation_requests table for matching donors with recipients
CREATE TABLE IF NOT EXISTS public.donation_requests (
  request_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  food_id uuid NOT NULL REFERENCES public.food_listings(id) ON DELETE CASCADE,
  donor_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  recipient_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  match_score numeric CHECK (match_score >= 0 AND match_score <= 100),
  status text NOT NULL CHECK (status IN ('pending', 'accepted', 'completed', 'rejected')) DEFAULT 'pending',
  timestamp timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on donation_requests
ALTER TABLE public.donation_requests ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for donation_requests
CREATE POLICY "Users can view their own donation requests"
ON public.donation_requests
FOR SELECT
USING (auth.uid() = donor_id OR auth.uid() = recipient_id);

CREATE POLICY "Recipients can create donation requests"
ON public.donation_requests
FOR INSERT
WITH CHECK (auth.uid() = recipient_id AND has_role(auth.uid(), 'recipient'::app_role));

CREATE POLICY "Donors can update their donation requests"
ON public.donation_requests
FOR UPDATE
USING (auth.uid() = donor_id)
WITH CHECK (auth.uid() = donor_id);

-- Create feedback_ratings table
CREATE TABLE IF NOT EXISTS public.feedback_ratings (
  feedback_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  rated_user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comments text,
  date timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on feedback_ratings
ALTER TABLE public.feedback_ratings ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for feedback_ratings
CREATE POLICY "Users can view feedback about themselves"
ON public.feedback_ratings
FOR SELECT
USING (auth.uid() = rated_user_id OR auth.uid() = user_id);

CREATE POLICY "Users can create feedback"
ON public.feedback_ratings
FOR INSERT
WITH CHECK (auth.uid() = user_id AND user_id != rated_user_id);

-- Create ai_analytics table (optional for AI predictions)
CREATE TABLE IF NOT EXISTS public.ai_analytics (
  analytics_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  region text NOT NULL,
  predicted_demand numeric,
  predicted_surplus numeric,
  timestamp timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on ai_analytics
ALTER TABLE public.ai_analytics ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for ai_analytics (read-only for all authenticated users)
CREATE POLICY "Authenticated users can view analytics"
ON public.ai_analytics
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_donation_requests_food_id ON public.donation_requests(food_id);
CREATE INDEX IF NOT EXISTS idx_donation_requests_donor_id ON public.donation_requests(donor_id);
CREATE INDEX IF NOT EXISTS idx_donation_requests_recipient_id ON public.donation_requests(recipient_id);
CREATE INDEX IF NOT EXISTS idx_donation_requests_status ON public.donation_requests(status);
CREATE INDEX IF NOT EXISTS idx_feedback_ratings_rated_user ON public.feedback_ratings(rated_user_id);
CREATE INDEX IF NOT EXISTS idx_ai_analytics_region ON public.ai_analytics(region);
CREATE INDEX IF NOT EXISTS idx_food_listings_category ON public.food_listings(category);

-- Create trigger for donation_requests updated_at
CREATE TRIGGER update_donation_requests_updated_at
BEFORE UPDATE ON public.donation_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for profile images
INSERT INTO storage.buckets (id, name, public)
VALUES ('profile-images', 'profile-images', true)
ON CONFLICT (id) DO NOTHING;

-- Create RLS policies for profile images storage
CREATE POLICY "Users can view all profile images"
ON storage.objects
FOR SELECT
USING (bucket_id = 'profile-images');

CREATE POLICY "Users can upload their own profile image"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'profile-images' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update their own profile image"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'profile-images' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own profile image"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'profile-images' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);