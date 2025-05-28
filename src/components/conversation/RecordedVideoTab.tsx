
'use client';

interface RecordedVideoTabProps {
  videoUrl: string | null;
}

export default function RecordedVideoTab({ videoUrl }: RecordedVideoTabProps) {
  return (
    <div className="w-full h-full flex flex-col items-center justify-center">
      {videoUrl ? (
        <video
          src={videoUrl}
          controls
          className="w-full max-w-2xl aspect-video rounded-lg shadow-md bg-black"
          data-ai-hint="recorded video player"
        >
          Your browser does not support the video tag.
        </video>
      ) : (
        <p className="text-muted-foreground italic text-center py-10">
          Recorded video will appear here after you finish a recording session.
        </p>
      )}
    </div>
  );
}
