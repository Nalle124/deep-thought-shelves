-- Revert page media to a public bucket: signed/private URLs can expire or break,
-- and the earlier switch to private broke already-uploaded (public-URL) images.
-- Public bucket + random UUID paths => links are permanent and never disappear.
update storage.buckets set public = true where id = 'page-media';
