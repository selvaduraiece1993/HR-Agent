# Video Recording Setup Guide

## Overview

The application now captures and stores complete interview recordings automatically when interviews are conducted.

## Features Implemented

✅ Automatic video recording when interview starts
✅ Recording indicator in the UI (red "REC" dot)
✅ Automatic upload to Supabase Storage when interview ends
✅ Video URL saved to interview results in database
✅ Error handling for recording failures

## Setup Instructions

### 1. Create Supabase Storage Bucket

You need to create a storage bucket in your Supabase project to store the video recordings.

**Steps:**

1. Go to your Supabase Dashboard
2. Navigate to **Storage** in the left sidebar
3. Click **New bucket**
4. Configure the bucket:
   - **Name**: `interview-recordings`
   - **Public**: ✅ Enable (so recruiters can view recordings)
   - **File size limit**: 500MB (or higher based on interview length)
   - **Allowed MIME types**: `video/webm`, `video/mp4`

5. Click **Create bucket**

### 2. Set Storage Policies

To allow authenticated users to upload and view recordings, you need to set up Row Level Security (RLS) policies.

**Go to Storage → interview-recordings → Policies**

**Policy 1: Allow Upload**

```sql
CREATE POLICY "Allow authenticated users to upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'interview-recordings');
```

**Policy 2: Allow Public Read**

```sql
CREATE POLICY "Allow public to read recordings"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'interview-recordings');
```

**Policy 3: Allow Recruiters to Delete** (Optional)

```sql
CREATE POLICY "Allow authenticated users to delete their recordings"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'interview-recordings');
```

### 3. Update Database Schema

Add a column to store the video URL in your `interview_results` table:

```sql
ALTER TABLE interview_results
ADD COLUMN video_recording_url TEXT;
```

Or if you're using Supabase Table Editor:

1. Go to **Table Editor**
2. Select `interview_results` table
3. Click **+ New Column**
4. Configure:
   - **Name**: `video_recording_url`
   - **Type**: `text`
   - **Default value**: `NULL`
   - **Is Nullable**: ✅ Yes
5. Click **Save**

### 4. Test the Recording

1. Start a new interview
2. Look for the red **REC** indicator next to the timer
3. Complete the interview
4. Check Supabase Storage → `interview-recordings` folder
5. Verify the video URL is saved in `interview_results` table

## Technical Details

### Recording Format

- **Codec**: VP9 (preferred) or VP8 with Opus audio
- **Video Bitrate**: 2.5 Mbps
- **Audio Bitrate**: 128 kbps
- **Format**: WebM (most browsers) or MP4 (fallback)

### File Naming Convention

```
interviews/{interview_id}/interview_{interview_id}_{timestamp}.webm
```

Example: `interviews/abc123/interview_abc123_1732723456789.webm`

### Storage Structure

```
interview-recordings/
├── interviews/
│   ├── {interview_id_1}/
│   │   └── interview_{interview_id_1}_{timestamp}.webm
│   ├── {interview_id_2}/
│   │   └── interview_{interview_id_2}_{timestamp}.webm
│   └── ...
```

## Viewing Recorded Interviews

The video URL is stored in the database and can be accessed:

1. **From the database:**

```sql
SELECT video_recording_url
FROM interview_results
WHERE interview_id = 'your-interview-id';
```

2. **In your application:**
   You can add a video player component to the completed interview page or recruiter dashboard to view recordings.

Example component:

```jsx
{
  interview.video_recording_url && (
    <video
      controls
      width="100%"
      className="rounded-lg"
      src={interview.video_recording_url}
    >
      Your browser does not support video playback.
    </video>
  );
}
```

## Troubleshooting

### Recording doesn't start

- Check browser console for errors
- Ensure MediaRecorder API is supported (Chrome, Edge, Firefox, Safari)
- Verify camera/microphone permissions are granted

### Upload fails

- Check Supabase Storage bucket exists: `interview-recordings`
- Verify storage policies are set correctly
- Check network connection
- Ensure Supabase credentials are correct in `.env.local`

### Recording is too large

- Reduce `videoBitsPerSecond` in `useVideoRecorder.js`
- Increase Supabase storage bucket file size limit
- Consider implementing video compression

### Video doesn't play

- Ensure browser supports WebM format (most modern browsers do)
- Check if the video URL is publicly accessible
- Verify storage bucket is set to **Public**

## Cost Considerations

**Supabase Storage Pricing (as of 2024):**

- Free tier: 1GB storage
- Pro tier: 100GB storage included
- Additional storage: $0.021/GB/month

**Estimate:**

- Average 10-minute interview: ~50-100MB
- 100 interviews: ~5-10GB
- Cost: ~$0.10-$0.21/month for additional storage

## Privacy & Compliance

⚠️ **Important:** Recording interviews may have legal implications:

- Inform candidates that interviews are being recorded
- Add consent checkbox during interview join
- Comply with GDPR, CCPA, or local privacy laws
- Implement data retention policies
- Provide ability for candidates to request deletion

## Future Enhancements

Potential improvements you can add:

- [ ] Add consent prompt before recording starts
- [ ] Show recording duration in the UI
- [ ] Implement video playback in recruiter dashboard
- [ ] Add download button for recruiters
- [ ] Implement automatic deletion after X days
- [ ] Add video transcription for searchability
- [ ] Support pause/resume recording
- [ ] Add video quality selection (HD, SD, Low)

## Support

If you encounter issues, check:

1. Browser console for JavaScript errors
2. Supabase logs for storage/upload errors
3. Network tab for failed API requests
4. Supabase Storage dashboard for uploaded files
