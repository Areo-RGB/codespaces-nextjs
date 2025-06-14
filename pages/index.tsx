import { useState, useEffect } from 'react';
import VideoPlayer from '../components/VideoPlayer';

interface Video {
  id: number;
  title: string;
  src: string;
  poster?: string;
}

interface VideoFile {
  key: string;
  url: string;
  title: string;
  size: number;
  lastModified: string;
}

function Home() {
  const [currentVideoIndex, setCurrentVideoIndex] = useState<number>(0);
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchVideos();
  }, []);

  const fetchVideos = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/videos');
      if (!response.ok) {
        throw new Error('Failed to fetch videos');
      }
      const videoFiles: VideoFile[] = await response.json();
      
      // Convert API response to Video format
      const formattedVideos: Video[] = videoFiles.map((file, index) => ({
        id: index + 1,
        title: file.title,
        src: file.url,
      }));

      setVideos(formattedVideos);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        fontSize: '1.5rem'
      }}>
        Loading videos...
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        fontSize: '1.5rem',
        color: 'red'
      }}>
        Error: {error}
      </div>
    );
  }

  if (videos.length === 0) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        fontSize: '1.5rem'
      }}>
        No videos found
      </div>
    );
  }

  return (
    <VideoPlayer
      videos={videos}
      currentIndex={currentVideoIndex}
      onVideoChange={setCurrentVideoIndex}
    />
  );
}

export default Home;
