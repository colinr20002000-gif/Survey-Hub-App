SELECT id, user_email, fcm_token, device_fingerprint, is_active, created_at FROM push_subscriptions WHERE user_email = 'colinr2000@hotmail.co.uk' ORDER BY created_at DESC LIMIT 5;
