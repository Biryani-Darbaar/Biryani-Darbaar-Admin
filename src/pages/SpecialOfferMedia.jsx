import MediaManager from "../components/MediaManager";
import { mediaAPI } from "../services/api";

export default function SpecialOfferMedia() {
  return (
    <MediaManager
      api={mediaAPI}
      title="Special Offer Media"
      helpText="shown on the user app's Special Offers section"
    />
  );
}
