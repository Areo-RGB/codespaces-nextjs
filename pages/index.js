import { useState } from 'react'
import VideoPlayer from '../components/VideoPlayer'

function Home() {
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0)
  
  const sampleVideos = [
    {
      id: 1,
      title: "Custom Video C1",
      src: "https://data4.fra1.cdn.digitaloceanspaces.com/c1.mov"
    },
    {
      id: 2,
      title: "Custom Video A1",
      src: "https://data4.fra1.cdn.digitaloceanspaces.com/a1.mp4"
    },
    {
      id: 3,
      title: "Sample Video 1",
      src: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
      poster: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/images/BigBuckBunny.jpg"
    },
    {
      id: 4,
      title: "Sample Video 2", 
      src: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4",
      poster: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/images/ElephantsDream.jpg"
    },
    {
      id: 5,
      title: "Sample Video 3",
      src: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
      poster: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/images/ForBiggerBlazes.jpg"
    }
  ]

  return (
    <VideoPlayer 
      videos={sampleVideos}
      currentIndex={currentVideoIndex}
      onVideoChange={setCurrentVideoIndex}
    />
  )
}

export default Home
