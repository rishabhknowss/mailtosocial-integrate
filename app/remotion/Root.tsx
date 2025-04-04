import React from 'react';
import { Composition } from 'remotion';
import RemotionVideo from './[id]/RemotionVideo';
 
export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="VideoPreview"
        component={RemotionVideo}
        durationInFrames={900} // 30 seconds at 30fps
        fps={30}
        width={720}
        height={1280}
        defaultProps={{
          projectId: 0,
          title: "Preview Video",
          images: [],
          audioUrl: null,
          transcript: null,
          timedScenes: [],
          lipsyncUrl: null,
          audioDuration: 30
        }}
      />
    </>
  );
};