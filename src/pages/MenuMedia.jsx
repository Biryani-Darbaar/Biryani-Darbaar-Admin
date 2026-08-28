import MediaManager from "../components/MediaManager";
import { menuMediaAPI } from "../services/api";

export default function MenuMedia() {
  return (
    <MediaManager
      api={menuMediaAPI}
      title="Menu Media"
      helpText="shown in the carousel on the website's Menu page"
    />
  );
}
