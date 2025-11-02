"use client";

import React, { useState } from "react";

/**
 * A component for playing training videos from YouTube.
 * Features a dropdown to select videos and back/forward buttons for navigation.
 */
export default function TrainingVideo() {
    // Sample YouTube video data (replace with your actual video IDs and titles)
    const videos = [
        { id: "qkV0UvjXgcs", title: "30 Second Chair Stand" },
        { id: "VUq6IgQAVJM", title: "4 Stage Balance Test" },
        { id: "tNay64Mab78", title: "TUG (Timed Up and Go)" }, 
    ];

    const [currentIndex, setCurrentIndex] = useState(0);
    const currentVideo = videos[currentIndex];

    const handlePrev = () => {
        setCurrentIndex((prev) => (prev > 0 ? prev - 1 : videos.length - 1));
    };

    const handleNext = () => {
        setCurrentIndex((prev) => (prev < videos.length - 1 ? prev + 1 : 0));
    };

    const handleSelect = (e) => {
        const index = parseInt(e.target.value, 10);
        setCurrentIndex(index);
    };

    return (
        <div className="flex flex-col items-center justify-center bg-gray-900 text-white p-1">
            {/* Video Player */}
            <div className="w-full max-w-4xl mb-8">
                <iframe
                    width="100%"
                    height="400"
                    src={`https://www.youtube.com/embed/${currentVideo.id}`}
                    title={currentVideo.title}
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    className="rounded-2xl shadow-2xl"
                ></iframe>
            </div>

            {/* Media Controls at the Bottom */}
            <div className="flex items-center justify-center space-x-6 bg-gray-800 p-6 rounded-2xl shadow-lg">
                <button
                    onClick={handlePrev}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-blue-400"
                    aria-label="Previous video"
                >
                    ←
                </button>

                <select
                    value={currentIndex}
                    onChange={handleSelect}
                    className="bg-gray-700 text-white px-4 py-3 rounded-lg font-semibold focus:outline-none focus:ring-4 focus:ring-gray-500"
                    aria-label="Select video"
                >
                    {videos.map((video, index) => (
                        <option key={index} value={index}>
                            {video.title}
                        </option>
                    ))}
                </select>

                <button
                    onClick={handleNext}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-blue-400"
                    aria-label="Next video"
                >
                    →
                </button>
            </div>
        </div>
    );
}