import FitnessHelper from "../components/FitnessHelper";
import TrainingVideo from "../components/TrainingVideo";

export default function HomePage() {
  return (
    <div>
      <h1 className="text-4xl font-bold mb-2">FIXME: NAME OF OUR APP</h1>
      <p className="text-lg text-gray-400 mb-6">
        FIXME: CATCHPHRASE? something like that
      </p>

      <div className="flex gap-4 h-screen">
        <div className="flex-1">
          <FitnessHelper />
        </div>
        <div className="flex-1">
          <TrainingVideo />
        </div>
      </div>
    </div>
  );
}