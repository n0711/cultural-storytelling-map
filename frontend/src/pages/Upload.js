import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import { ZoomControl } from "react-leaflet";
import { Link } from "react-router-dom";
import "leaflet/dist/leaflet.css";
import { useState } from "react";
import API from "../services/Api";
import Navbar from "../components/Navbar";
import AiLoader from "../components/AiLoader";
import { CATEGORIES, getMarkerIcon } from "../constants/categories";
import "../assets/styles/uploadstory.css";

const COMPANION_CARD_MESSAGES = [
    "Reading your story…",
    "Finding the cultural themes…",
    "Writing the companion card…",
];

const SUBMIT_MESSAGES = [
    "Saving your story…",
    "Running a quick respectful-content check…",
    "Almost there…",
];

// joins ["a title", "a category"] into "a title and a category", or with more
// items "a title, a category, and a location on the map"
const formatList = (items) => {
    if (items.length === 1) return items[0];
    if (items.length === 2) return `${items[0]} and ${items[1]}`;
    return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
};

// centers the picker map on cyprus and keeps panning inside island bounds
const CYPRUS_CENTER = [35.1264, 33.4299];
const CYPRUS_BOUNDS = [
    [34.5, 32.0], // southwest map limit
    [35.7, 34.8], // northeast map limit
];

// captures map clicks and sends the selected coordinates to the form
function LocationMarker({ setPosition, onSelectLocation }) {
    useMapEvents({
        click(e) {
            const coords = { lat: e.latlng.lat, lng: e.latlng.lng };
            setPosition([coords.lat, coords.lng]); // shows the marker on the map
            onSelectLocation(coords); // saves the coordinates into the form state
        },
    });
    return null;
}

// renders the story upload form and location picker
export default function Upload() {
    // tracks the marker position selected on the map
    const [position, setPosition] = useState(null);

    // stores the story form values before submission
    const [formData, setFormData] = useState({
        title: "",
        narrative: "",
        location: null,
        category: "",
        isAnonymous: false,
    });

    const [companionCard, setCompanionCard] = useState(null);
    const [selectedImages, setSelectedImages] = useState([]);
    const [selectedAudio, setSelectedAudio] = useState(null);
    const [mediaInputKey, setMediaInputKey] = useState(0);
    const [submitting, setSubmitting] = useState(false);
    const [loadingAI, setLoadingAI] = useState(false);
    const [feedback, setFeedback] = useState(null);

    const isLoggedIn = Boolean(localStorage.getItem("access_token"));

    // lists what's still missing so the disabled submit button can explain
    // itself instead of silently refusing to click -- this is exactly the trap
    // a first-time user (and every real user) will otherwise hit
    const missingFields = [];
    if (formData.title.trim() === "") missingFields.push("a title");
    if (formData.narrative.trim() === "") missingFields.push("your story");
    if (formData.category === "") missingFields.push("a category");
    if (formData.location == null) missingFields.push("a location on the map");

    // disables submit until the required text and location are filled
    const btnDisable = submitting || missingFields.length > 0;

    const aiDisabled =
        loadingAI ||
        formData.title.trim() === "" ||
        formData.narrative.trim() === "" ||
        formData.category === "";

    // saves the selected map coordinates into the form data
    const handleLocationSelect = (coords) => {
        setFormData((prev) => ({ ...prev, location: coords }));
    };

    // updates text fields and checkbox values
    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        setCompanionCard(null);
        setFormData((prev) => ({
            ...prev,
            [name]: type === "checkbox" ? checked : value,
        }));
    };

    const handleMediaChange = (e) => {
        const { name, files } = e.target;
        const selectedFiles = Array.from(files || []);

        if (name === "images") setSelectedImages(selectedFiles);
        if (name === "audio") setSelectedAudio(selectedFiles[0] || null);
    };

    const uploadFile = async (file) => {
        const data = new FormData();
        data.append("file", file);

        const res = await API.post("/media/upload", data);
        return res.data.media_url;
    };

    // submits the story payload to the backend api
    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        setFeedback(null);

        try {
            const imageUrl = selectedImages[0]
                ? await uploadFile(selectedImages[0])
                : null;

            const audioUrl = selectedAudio ? await uploadFile(selectedAudio) : null;

            const payload = {
                title: formData.title.trim(),
                content: formData.narrative.trim(),
                image_url: imageUrl,
                audio_url: audioUrl,
                latitude: formData.location?.lat,
                longitude: formData.location?.lng,
                category: formData.category,
                is_anonymous: formData.isAnonymous,
            };

            const res = await API.post("/stories", payload);

            setFeedback({
                type: "success",
                storyId: res.data.id,
                pending: res.data.status === "pending",
            });

            setFormData({
                title: "",
                narrative: "",
                location: null,
                category: "",
                isAnonymous: false,
            });

            setPosition(null);
            setCompanionCard(null);
            setSelectedImages([]);
            setSelectedAudio(null);
            setMediaInputKey((key) => key + 1);
            window.scrollTo({ top: 0, behavior: "smooth" });
        } catch (err) {
            const detail = err.response?.data?.detail;
            setFeedback({
                type: "error",
                message:
                    err.response?.status === 401
                        ? "Please log in before sharing a story."
                        : typeof detail === "string"
                        ? detail
                        : "Upload failed. Please check your details and try again.",
            });
        } finally {
            setSubmitting(false);
        }
    };

    const handleGenerateAI = async () => {
        if (aiDisabled) return;

        setLoadingAI(true);
        setFeedback(null);

        try {
            const res = await API.post("/ai/generate-companion-card", {
                title: formData.title.trim(),
                content: formData.narrative.trim(),
                category: formData.category,
            });

            setCompanionCard(res.data);
        } catch (err) {
            const detail = err.response?.data?.detail;
            setFeedback({
                type: "error",
                message:
                    typeof detail === "string"
                        ? detail
                        : "Could not generate the companion card. Please try again.",
            });
        } finally {
            setLoadingAI(false);
        }
    };

    return (
        <div className="upload-story-container">
            <Navbar />

            {/* introduces the upload page */}
            <div className="story-header text-center">
                <h1>
                    Share a Fragment of <span className="gradient-text">History</span>
                </h1>
                <p>Pin your story to the living map of our collective heritage.</p>
            </div>

            <div className="story-card">
                {/* result banner replaces the old blocking alerts */}
                {feedback?.type === "success" && (
                    <div className="upload-banner upload-banner-success">
                        <i className="bi bi-check-circle-fill"></i>
                        <div>
                            <strong>
                                {feedback.pending ? "Your story is awaiting review." : "Your story is live."}
                            </strong>
                            <span>
                                {feedback.pending
                                    ? "It's queued for moderation and will appear once approved."
                                    : "It's on the map now — thank you for sharing."}
                            </span>
                        </div>
                        {feedback.pending ? (
                            <Link to="/browse" className="upload-banner-btn">
                                Browse stories
                            </Link>
                        ) : (
                            <Link to={`/story/${feedback.storyId}`} className="upload-banner-btn">
                                View it
                            </Link>
                        )}
                    </div>
                )}

                {feedback?.type === "error" && (
                    <div className="upload-banner upload-banner-error">
                        <i className="bi bi-exclamation-circle-fill"></i>
                        <div>
                            <strong>Something went wrong.</strong>
                            <span>{feedback.message}</span>
                        </div>
                    </div>
                )}

                {!isLoggedIn && (
                    <div className="upload-banner upload-banner-info">
                        <i className="bi bi-info-circle-fill"></i>
                        <div>
                            <strong>You're not signed in.</strong>
                            <span>
                                <Link to="/login">Log in</Link> to publish your story to the map.
                            </span>
                        </div>
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    {/* collects the story title */}
                    <div className="form-section">
                        <label className="form-label">Story Title</label>
                        <input
                            type="text"
                            name="title"
                            className="form-control p-3"
                            placeholder="Enter a memorable name for your story"
                            value={formData.title}
                            onChange={handleInputChange}
                        />
                    </div>

                    {/* collects the main story narrative */}
                    <div className="form-section">
                        <label className="form-label">The narrative</label>
                        <textarea
                            name="narrative"
                            className="form-control textarea-large p-3"
                            rows="6"
                            placeholder="Describe the memory, the event, or the significance of this place…"
                            value={formData.narrative}
                            onChange={handleInputChange}
                        />
                        <span className="field-hint">
                            {formData.narrative.trim().length} characters
                        </span>
                    </div>

                    {/* lets the user select a story category */}
                    <div className="form-section">
                        <label className="form-label">Category</label>
                        <div className="category-picker">
                            {CATEGORIES.map((category) => (
                                <button
                                    type="button"
                                    key={category.key}
                                    className={`category-option ${
                                        formData.category === category.key ? "active" : ""
                                    }`}
                                    style={
                                        formData.category === category.key
                                            ? {
                                                  borderColor: category.color,
                                                  background: `${category.color}14`,
                                              }
                                            : undefined
                                    }
                                    onClick={() => {
                                        setCompanionCard(null);
                                        setFormData((prev) => ({
                                            ...prev,
                                            category: category.key,
                                        }));
                                    }}
                                >
                                    <span
                                        className="category-dot"
                                        style={{ background: category.color }}
                                    >
                                        <i className={`bi ${category.icon}`}></i>
                                    </span>
                                    {category.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* shows the media upload fields */}
                    <div className="upload-boxes">
                        <div className="upload-box text-center">
                            <input
                                key={`images-${mediaInputKey}`}
                                type="file"
                                id="images-input"
                                name="images"
                                multiple
                                accept="image/*"
                                onChange={handleMediaChange}
                            />
                            <label htmlFor="images-input" className="upload-label">
                                <div className="upload-icon">
                                    <i className="bi bi-image"></i>
                                </div>
                                <h6>Upload Images</h6>
                                <p>
                                    {selectedImages.length > 0
                                        ? `${selectedImages.length} image${
                                              selectedImages.length === 1 ? "" : "s"
                                          } ready to upload`
                                        : "Select images to upload with this story"}
                                </p>
                            </label>
                        </div>

                        <div className="upload-box text-center">
                            <input
                                key={`audio-${mediaInputKey}`}
                                type="file"
                                id="audio-input"
                                name="audio"
                                accept="audio/*"
                                onChange={handleMediaChange}
                            />
                            <label htmlFor="audio-input" className="upload-label">
                                <div className="upload-icon">
                                    <i className="bi bi-mic"></i>
                                </div>
                                <h6>Add Oral History</h6>
                                <p>
                                    {selectedAudio
                                        ? `${selectedAudio.name} ready to upload`
                                        : "Select audio to upload with this story"}
                                </p>
                            </label>
                        </div>
                    </div>

                    {/* lets the user choose a map location */}
                    <div className="form-section">
                        <label className="form-label">Geographic Anchor</label>
                        <div className="map-wrapper">
                            <MapContainer
                                center={CYPRUS_CENTER}
                                zoom={9}
                                maxBounds={CYPRUS_BOUNDS}
                                maxBoundsViscosity={1.0}
                                zoomControl={false}
                                className="location-picker-map"
                                style={{ borderRadius: "15px" }}
                            >
                                <TileLayer
                                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                    attribution='&copy; OpenStreetMap contributors'
                                />

                                <LocationMarker
                                    setPosition={setPosition}
                                    onSelectLocation={handleLocationSelect}
                                />

                                {/* pin previews the colour of the chosen category */}
                                {position && (
                                    <Marker
                                        position={position}
                                        icon={getMarkerIcon(formData.category)}
                                    />
                                )}

                                <ZoomControl position="topright" />
                            </MapContainer>

                            <div
                                className={`map-overlay ${
                                    formData.location
                                        ? "map-overlay-confirmed"
                                        : "map-overlay-pending"
                                }`}
                            >
                                <i
                                    className={`bi ${
                                        formData.location
                                            ? "bi-check-circle-fill"
                                            : "bi-hand-index-thumb-fill"
                                    }`}
                                ></i>
                                <p>
                                    {formData.location
                                        ? `Pinned at ${formData.location.lat.toFixed(
                                              4
                                          )}, ${formData.location.lng.toFixed(4)}`
                                        : "Click anywhere on the map to pin your story's location"}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* lets a contributor stay unnamed on the public story */}
                    <div className="form-section">
                        <label className="anon-toggle">
                            <input
                                type="checkbox"
                                name="isAnonymous"
                                checked={formData.isAnonymous}
                                onChange={handleInputChange}
                            />
                            <span className="anon-toggle-track">
                                <span className="anon-toggle-thumb" />
                            </span>
                            <span className="anon-toggle-text">
                                <strong>Share anonymously</strong>
                                <small>Your name won't be shown on the published story.</small>
                            </span>
                        </label>
                    </div>

                    {/* submits the story once required fields are complete */}
                    <div className="form-section submit-section">
                        <button
                            type="submit"
                            id="submit-btn"
                            className="main-btn rounded-pill"
                            disabled={btnDisable}
                        >
                            {submitting ? "SAVING…" : "SUBMIT STORY"}
                        </button>

                        <button
                            type="button"
                            className="main-btn rounded-pill"
                            id="ai-btn"
                            onClick={handleGenerateAI}
                            disabled={aiDisabled}
                        >
                            {loadingAI ? (
                                <AiLoader inline messages={["Generating…"]} />
                            ) : (
                                <>
                                    <i className="bi bi-stars"></i> Generate Companion Card
                                </>
                            )}
                        </button>
                    </div>

                    {/* explains exactly why the submit button won't click yet */}
                    {!submitting && missingFields.length > 0 && (
                        <p className="submit-hint">
                            <i className="bi bi-info-circle-fill"></i>
                            Before you can submit, add {formatList(missingFields)}.
                        </p>
                    )}

                    {/* narrates the AI moderation-assist check that runs as part of saving */}
                    {submitting && (
                        <div className="submit-status">
                            <AiLoader inline messages={SUBMIT_MESSAGES} />
                        </div>
                    )}

                    {loadingAI && !companionCard && (
                        <div className="ai-companion-panel ai-companion-panel-loading">
                            <AiLoader messages={COMPANION_CARD_MESSAGES} />
                        </div>
                    )}

                    {companionCard && (
                        <div className="ai-companion-panel">
                            <h5>
                                <i className="bi bi-stars"></i>
                                Companion Card
                                <span
                                    className={`ai-source-badge ${
                                        companionCard.generated_by === "gemini" ? "live" : ""
                                    }`}
                                >
                                    {companionCard.generated_by === "gemini"
                                        ? "Generated by Gemini"
                                        : "Generated automatically"}
                                </span>
                            </h5>

                            <p className="ai-companion-summary">
                                {companionCard.short_summary}
                            </p>

                            <div className="ai-companion-tags">
                                {companionCard.themes.map((theme) => (
                                    <span key={theme}>{theme}</span>
                                ))}
                            </div>

                            <div className="ai-companion-section">
                                <h6>Timeline</h6>
                                <ol>
                                    {companionCard.timeline.map((item) => (
                                        <li key={item}>{item}</li>
                                    ))}
                                </ol>
                            </div>

                            <div className="ai-companion-section">
                                <h6>Cultural Value</h6>
                                <p>{companionCard.cultural_value}</p>
                            </div>

                            <p className="ai-companion-note">{companionCard.respect_note}</p>
                            <p className="ai-companion-note">{companionCard.safety_notice}</p>
                        </div>
                    )}
                </form>
            </div>

            {/* shows the closing page quote */}
            <div className="story-footer text-center fst-italic">
                <p>"We are the stories we tell." — The Curator</p>
            </div>
        </div>
    );
}
