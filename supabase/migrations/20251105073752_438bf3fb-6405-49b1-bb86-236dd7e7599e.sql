-- Allow users to view profiles of people they have accepted donation requests with
CREATE POLICY "Users can view profiles of donation request participants"
ON public.profiles
FOR SELECT
USING (
  auth.uid() = id 
  OR 
  EXISTS (
    SELECT 1 FROM public.donation_requests
    WHERE (
      (donation_requests.donor_id = auth.uid() AND donation_requests.recipient_id = profiles.id)
      OR
      (donation_requests.recipient_id = auth.uid() AND donation_requests.donor_id = profiles.id)
    )
    AND donation_requests.status = 'accepted'
  )
);