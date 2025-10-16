-- Fix the assign_initial_user_role function to allow donor signups
-- Previously it only allowed 'recipient' role, now it allows all roles
CREATE OR REPLACE FUNCTION public.assign_initial_user_role(_role app_role)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Prevent duplicate role assignment
  IF EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid()) THEN
    RAISE EXCEPTION 'User already has a role assigned';
  END IF;
  
  -- Allow all roles to be self-assigned
  INSERT INTO public.user_roles (user_id, role)
  VALUES (auth.uid(), _role);
END;
$$;