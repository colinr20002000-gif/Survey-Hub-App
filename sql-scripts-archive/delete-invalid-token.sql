-- Delete the invalid FCM token for jay.kinney
-- This token is returning "Requested entity was not found" error from FCM

DELETE FROM push_subscriptions
WHERE fcm_token = 'eSVsxw9chBcBmJvZdbXKl5:APA91bFsqRmW86VwdlUUPN2pvmVzW6pf-s6Yc2aP0OrdO4i-Omp99p56Z43U_hKvxHONaHFDNq1dxs0z9NvvfWcV0V4bLhG06yuSNj0PvF_Y4ywJHovqGH4';

-- After running this, have jay.kinney refresh the page to get a new valid token
