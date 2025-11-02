"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  PoseLandmarker,
  FilesetResolver,
  DrawingUtils,
} from "@mediapipe/tasks-vision";
import { Video, StopCircle, Loader2 } from "lucide-react";

/**
 * A component that uses MediaPipe to detect body pose and provide feedback.
 */
export default function FitnessHelper() {
  // --- CONSTANTS ---
  // Using a specific, stable version of the MediaPipe library for WASM files.
  const MEDIAPIPE_BASE_PATH = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14";

  // FIX: Using the direct, stable Google Storage link for the model file to bypass CDN path resolution issues.
  const POSE_MODEL_URL = "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task";


  // --- STATE & REFS ---
  const [isLoading, setIsLoading] = useState(true);
  const [isWebcamStarted, setIsWebcamStarted] = useState(false);
  const [feedback, setFeedback] = useState("Start webcam to begin.");

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const animationFrameId = useRef(null);
  const poseLandmarker = useRef(null);
  const drawingUtils = useRef(null);

  // --- MEDIAPIPE INITIALIZATION ---

  /**
   * Loads the MediaPipe PoseLandmarker model.
   */
  const setupMediaPipe = async () => {
    try {
      // Use the specific version path for the WASM files
      const vision = await FilesetResolver.forVisionTasks(
        `${MEDIAPIPE_BASE_PATH}/wasm`
      );

      // Create the PoseLandmarker
      poseLandmarker.current = await PoseLandmarker.createFromOptions(vision, {
        baseOptions: {
          // Using the fixed, direct model URL.
          modelAssetPath: POSE_MODEL_URL,
          delegate: "GPU",
        },
        runningMode: "VIDEO",
        numPoses: 1, // Only detect one person
      });

      // Get drawing utilities
      drawingUtils.current = new DrawingUtils(
        canvasRef.current.getContext("2d")
      );

      console.log("MediaPipe setup complete.");
      setIsLoading(false);
      setFeedback("Ready to start. Press the webcam icon!");
    } catch (error) {
      console.error("Error setting up MediaPipe:", error);
      setFeedback("Failed to load AI model. Please refresh.");
    }
  };

  // --- WEBCAM & DETECTION LOOP ---

  /**
   * Starts the webcam feed.
   */
  const startWebcam = async () => {
    if (!poseLandmarker.current) {
      console.log("PoseLandmarker not ready.");
      return;
    }

    if (animationFrameId.current) {
      stopWebcam();
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 1280, height: 720 },
      });
      videoRef.current.srcObject = stream;
      videoRef.current.addEventListener("loadeddata", () => {
        setIsWebcamStarted(true);
        setFeedback("Webcam started. Get in position.");
        // Start the detection loop
        predictWebcam();
      });
    } catch (error) {
      console.error("Error accessing webcam:", error);
      setFeedback("Could not access webcam. Please check permissions.");
    }
  };

  /**
   * Stops the webcam feed and detection loop.
   */
  const stopWebcam = () => {
    // Stop the animation loop
    if (animationFrameId.current) {
      cancelAnimationFrame(animationFrameId.current);
      animationFrameId.current = null;
    }

    // Release webcam stream
    if (videoRef.current && videoRef.current.srcObject) {
      videoRef.current.srcObject.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }

    // Clear the canvas
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    setIsWebcamStarted(false);
    setFeedback("Webcam stopped. Press the icon to start again.");
  };

  /**
   * The main detection loop.
   */
  const predictWebcam = () => {
    if (!videoRef.current || !canvasRef.current || !poseLandmarker.current) {
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    // Match canvas size to video feed
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const startTimeMs = performance.now();
    const results = poseLandmarker.current.detectForVideo(video, startTimeMs);

    // Clear canvas and draw video frame
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Draw landmarks if detected
    if (results.landmarks && results.landmarks.length > 0) {
      const landmarks = results.landmarks[0];

      // Draw the pose
      drawingUtils.current.drawLandmarks(landmarks, {
        radius: (data) => DrawingUtils.lerp(data.from.z, -0.15, 0.1, 5, 1),
        color: "#ffffff",
      });
      drawingUtils.current.drawConnectors(landmarks, PoseLandmarker.POSE_CONNECTIONS, {
        color: "#0ea5e9", // A nice blue color
        lineWidth: 3,
      });

      // --- Posture Feedback Logic ---
      analyzePosture(landmarks);
    } else {
      setFeedback("No person detected. Stand in full view.");
    }

    // Continue the loop
    animationFrameId.current = requestAnimationFrame(predictWebcam);
  };

  // --- POSTURE ANALYSIS ---

  /**
   * Calculates the angle between three 2D points.
   * @param {object} p1 - Landmark 1 {x, y}
   * @param {object} p2 - Landmark 2 (the vertex) {x, y}
   * @param {object} p3 - Landmark 3 {x, y}
   * @returns {number} The angle in degrees.
   */
  const calculateAngle = (p1, p2, p3) => {
    const a = Math.sqrt((p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2);
    const b = Math.sqrt((p3.x - p2.x) ** 2 + (p3.y - p2.y) ** 2);
    const c = Math.sqrt((p1.x - p3.x) ** 2 + (p1.y - p3.y) ** 2);

    // Law of Cosines
    let angleRad = Math.acos((a ** 2 + b ** 2 - c ** 2) / (2 * a * b));
    let angleDeg = angleRad * (180 / Math.PI);

    return angleDeg;
  };

  /**
   * Analyzes the pose landmarks to provide feedback (e.g., for a squat).
   * @param {Array<object>} landmarks - Array of landmark objects from MediaPipe.
   */
  const analyzePosture = (landmarks) => {
    // Landmark indices from MediaPipe Pose
    const LEFT_HIP = 23;
    const LEFT_KNEE = 25;
    const LEFT_ANKLE = 27;

    // Check if landmarks are visible
    if (
      landmarks[LEFT_HIP].visibility > 0.8 &&
      landmarks[LEFT_KNEE].visibility > 0.8 &&
      landmarks[LEFT_ANKLE].visibility > 0.8
    ) {
      // Get the 2D coordinates (x, y)
      const hip = landmarks[LEFT_HIP];
      const knee = landmarks[LEFT_KNEE];
      const ankle = landmarks[LEFT_ANKLE];

      // Calculate the knee angle
      const kneeAngle = calculateAngle(hip, knee, ankle);

      // Provide feedback based on the angle
      if (kneeAngle > 160) {
        setFeedback("Stand straight, then begin your squat.");
      } else if (kneeAngle > 100) {
        setFeedback("Squat deeper... Lower your hips.");
      } else if (kneeAngle > 80) {
        setFeedback("Good depth! Hold or push up.");
      } else {
        setFeedback("Great squat! Now stand back up.");
      }
    } else {
      setFeedback("Make sure your left side is visible to the camera.");
    }
  };

  // --- LIFECYCLE ---

  // On component mount, setup MediaPipe
  useEffect(() => {
    setupMediaPipe();

    // Cleanup function
    return () => {
      stopWebcam();
      if (poseLandmarker.current) {
        poseLandmarker.current.close();
      }
    };
  }, []);

  // --- RENDER ---

  return (
    <div className="flex flex-col items-center justify-center bg-gray-900 text-white p-4">

      {/* Main Card */}
      <div className="w-full max-w-4xl bg-gray-800 rounded-2xl shadow-2xl overflow-hidden">
        {/* Loading Overlay */}
        {isLoading && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-gray-800 bg-opacity-90">
            <Loader2 className="w-16 h-16 animate-spin text-blue-500" />
            <p className="mt-4 text-xl">Loading Exercise Model...</p>
          </div>
        )}

        {/* Canvas & Video Container */}
        <div className="relative w-full aspect-video">
          {/* Canvas for drawing */}
          <canvas
            ref={canvasRef}
            className="absolute top-0 left-0 w-full h-full z-10"
          ></canvas>
          {/* Video (hidden, but provides the feed) */}
          <video
            ref={videoRef}
            autoPlay
            playsInline
            className="w-full h-full transform -scale-x-100" // Flip horizontally
          ></video>

          {/* Control Button - overlaid on video */}
          <button
            onClick={isWebcamStarted ? stopWebcam : startWebcam}
            disabled={isLoading}
            className={`absolute bottom-4 right-4 z-10 flex items-center justify-center w-20 h-20 rounded-full text-white shadow-lg transition-all duration-300 focus:outline-none focus:ring-4
              ${isLoading
                ? "bg-gray-500 cursor-not-allowed"
                : isWebcamStarted
                  ? "bg-red-600 hover:bg-red-700 focus:ring-red-400"
                  : "bg-blue-600 hover:bg-blue-700 focus:ring-blue-400"
              }`}
            aria-label={isWebcamStarted ? "Stop webcam" : "Start webcam"}
          >
            {isWebcamStarted ? (
              <StopCircle className="w-10 h-10" />
            ) : (
              <Video className="w-10 h-10" />
            )}
          </button>
        </div>

        {/* Feedback Display */}
        <div className="p-6 bg-gray-700">
          <h2 className="text-lg font-semibold text-gray-300 mb-2">
            Posture Feedback
          </h2>
          <p className="text-2xl font-bold text-sky-400">{feedback}</p>
        </div>
      </div>
    </div>
  );
}