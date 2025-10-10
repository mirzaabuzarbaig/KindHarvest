-- Update the handle_new_user function to wait for role to be set manually
-- This is already handled in the signup flow in Auth.tsx

-- Add an index to improve query performance on user_roles
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);

-- Add an index to improve query performance on food_listings
CREATE INDEX IF NOT EXISTS idx_food_listings_donor_id ON public.food_listings(donor_id);
CREATE INDEX IF NOT EXISTS idx_food_listings_status ON public.food_listings(status);