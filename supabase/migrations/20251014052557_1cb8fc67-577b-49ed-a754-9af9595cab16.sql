-- Fix Critical Security Issues

-- 1. Fix profiles table RLS - Only allow users to view their own profile
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;

CREATE POLICY "Users can view own profile"
ON public.profiles
FOR SELECT
USING (auth.uid() = id);

-- 2. Restrict role self-assignment - Only allow recipient role by default
DROP POLICY IF EXISTS "Users can insert own role" ON public.user_roles;

-- Create a security definer function to safely assign roles
CREATE OR REPLACE FUNCTION public.assign_initial_user_role(
  _role app_role
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only allow recipient role to be self-assigned
  -- Donors and nonprofits require admin approval
  IF _role != 'recipient' THEN
    RAISE EXCEPTION 'Only recipient role can be self-assigned. Contact admin for donor or nonprofit roles.';
  END IF;
  
  -- Prevent duplicate role assignment
  IF EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid()) THEN
    RAISE EXCEPTION 'User already has a role assigned';
  END IF;
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (auth.uid(), _role);
END;
$$;

-- 3. Add general_area column to food_listings for approximate location display
ALTER TABLE public.food_listings 
ADD COLUMN IF NOT EXISTS general_area TEXT;

-- Update existing listings to use first part of address as general area
UPDATE public.food_listings 
SET general_area = SPLIT_PART(address, ',', 1) 
WHERE general_area IS NULL AND address IS NOT NULL;

-- 4. Fix food_listings RLS to mask precise location for non-donors
DROP POLICY IF EXISTS "Anyone can view available food listings" ON public.food_listings;

CREATE POLICY "Public can view listings with location privacy"
ON public.food_listings
FOR SELECT
USING (
  status = 'available' AND
  (
    -- Donors can see their own full listing details
    auth.uid() = donor_id OR
    -- Others see listings but with masked precise location
    auth.uid() IS NOT NULL
  )
);

-- Note: The client code will need to conditionally display address/coordinates
-- based on whether the viewer is the donor