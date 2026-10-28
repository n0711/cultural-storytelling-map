import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from "react-leaflet";
import { ZoomControl } from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import L from "leaflet";
import { Link } from "react-router-dom";
import "leaflet/dist/leaflet.css";
import "../assets/styles/mapview.css";
import { useEffect, useMemo, useRef, useState } from "react";
import API, { mediaUrl } from "../services/Api";
import { CATEGORIES, getCategory, getMarkerIcon } from "../constants/categories";
import Logo from "../assets/images/logo.png";

// centers the map on cyprus and keeps panning inside island bounds
const CYPRUS_CENTER = [35.1264, 33.4299];
const CYPRUS_BOUNDS = [
    [34.5, 32.0], // southwest map limit
    [35.7, 34.8], // northeast map limit
];
const CYPRUS_ZOOM = 9;

// groups nearby pins into one numbered bubble until the user zooms in
const createClusterIcon = (cluster) => {
    const count = cluster.getChildCount();
    const size = count < 10 ? "sm" : count < 100 ? "md" : "lg";

    return L.divIcon({
        html: `<span>${count}</span>`,
        className: `map-cluster map-cluster-${size}`,
        iconSize: L.point(40, 40, true),
    });
};

// keeps clicks on a custom control from also panning or zooming the map
function useStopMapEvents() {
    const ref = useRef(null);

    useEffect(() => {
        if (ref.current) {
            L.DomEvent.disableClickPropagation(ref.current);
            L.DomEvent.disableScrollPropagation(ref.current);
        }
    }, []);

    return ref;
}

// reports whether a story popup is open, so small screens can clear the floating panels
function PopupWatcher({ onChange }) {
    useMapEvents({
        popupopen: () => onChange(true),
        popupclose: () => onChange(false),
    });

    return null;
}

// returns the view to the whole island after panning or zooming in
function ResetViewButton() {
    const map = useMap();
    const ref = useStopMapEvents();

    return (
        <div className="map-reset" ref={ref}>
            <button
                type="button"
                title="Reset map view"
                aria-label="Reset map view to all of Cyprus"
                onClick={() => map.flyTo(CYPRUS_CENTER, CYPRUS_ZOOM, { duration: 0.8 })}
            >
                <i className="bi bi-arrows-fullscreen" aria-hidden="true"></i>
            </button>
        </div>
    );
}

// collapsible key: category colours, how many stories each has, and a quick filter
function MapLegend({ counts, total, activeCategory, onCategoryChange }) {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className={`map-legend ${isOpen ? "open" : ""}`}>
            <button
                type="button"
                className="map-legend-toggle"
                aria-expanded={isOpen}
                aria-controls="map-legend-list"
                onClick={() => setIsOpen((open) => !open)}
            >
                <i className="bi bi-layers-fill" aria-hidden="true"></i>
                Legend
                <i
                    className={`bi ${isOpen ? "bi-chevron-down" : "bi-chevron-up"} map-legend-caret`}
                    aria-hidden="true"
                ></i>
            </button>

            {isOpen && (
                <ul id="map-legend-list" className="map-legend-list">
                    <li>
                        <button
                            type="button"
                            className={activeCategory === "all" ? "active" : ""}
                            onClick={() => onCategoryChange?.("all")}
                        >
                            <span className="map-legend-dot map-legend-dot-all" />
                            <span className="map-legend-label">All stories</span>
                            <span className="map-legend-count">{total}</span>
                        </button>
                    </li>
                    {CATEGORIES.map((category) => (
                        <li key={category.key}>
                            <button
                                type="button"
                                className={activeCategory === category.key ? "active" : ""}
                                disabled={!counts[category.key] && activeCategory !== category.key}
                                onClick={() =>
                                    onCategoryChange?.(
                                        activeCategory === category.key ? "all" : category.key
                                    )
                                }
                            >
                                <span
                                    className="map-legend-dot"
                                    style={{ background: category.color }}
                                />
                                <span className="map-legend-label">{category.label}</span>
                                <span className="map-legend-count">
                                    {counts[category.key] || 0}
                                </span>
                            </button>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}

// pans and zooms the map to a matching story when searching
function FlyToStory({ story }) {
    const map = useMap();
    const id = story?.id;

    useEffect(() => {
        if (story) {
            map.flyTo([Number(story.latitude), Number(story.longitude)], 14, {
                duration: 1.2,
            });
        }
        // only re-fly when the matched story changes
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id]);

    return null;
}

// builds a short preview for each story popup
const getStoryPreview = (story) => {
    if (!story.content) {
        return "No story content available yet.";
    }

    return story.content.length > 110
        ? `${story.content.slice(0, 110).trimEnd()}…`
        : story.content;
};

// renders the reusable story map with approved story markers
export default function MapView({
    activeCategory,
    onCategoryChange,
    focusStoryId,
    focusLocationLabel,
}) {
    const [stories, setStories] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [loadError, setLoadError] = useState("");
    const [searchTerm, setSearchTerm] = useState("");
    const [isPopupOpen, setIsPopupOpen] = useState(false);

    // fetches every approved story once; category and search filter client-side,
    // so the legend can show counts for categories that aren't selected
    useEffect(() => {
        let isCurrent = true;

        const fetchStories = async () => {
            setIsLoading(true);
            setLoadError("");

            try {
                const res = await API.get("/stories");
                if (isCurrent) setStories(res.data);
            } catch (err) {
                if (isCurrent) {
                    setLoadError(
                        "We couldn't load the stories. Check the connection and try again."
                    );
                }
            } finally {
                if (isCurrent) setIsLoading(false);
            }
        };

        fetchStories();
        return () => {
            isCurrent = false;
        };
    }, []);

    // stories with usable coordinates that match the search, in any category
    const searchedStories = useMemo(() => {
        const term = searchTerm.trim().toLowerCase();

        return stories.filter((story) => {
            const hasValidCoords =
                Number.isFinite(Number(story.latitude)) &&
                Number.isFinite(Number(story.longitude));

            if (!hasValidCoords) return false;
            if (!term) return true;

            // matches on title and story body so search finds themes, not just names
            return (
                story.title?.toLowerCase().includes(term) ||
                story.content?.toLowerCase().includes(term)
            );
        });
    }, [stories, searchTerm]);

    // per-category totals for the legend
    const categoryCounts = useMemo(() => {
        const counts = {};
        searchedStories.forEach((story) => {
            counts[story.category] = (counts[story.category] || 0) + 1;
        });
        return counts;
    }, [searchedStories]);

    // the stories actually pinned on the map
    const filteredStories = useMemo(
        () =>
            activeCategory === "all"
                ? searchedStories
                : searchedStories.filter((story) => story.category === activeCategory),
        [searchedStories, activeCategory]
    );

    return (
        <div className={`map-container ${isPopupOpen ? "popup-open" : ""}`}>
            {/* floating search panel over the map */}
            <div className="map-search">
                <div className="map-search-field">
                    <i className="bi bi-search" aria-hidden="true"></i>
                    <input
                        type="search"
                        placeholder="Search stories, places, themes…"
                        aria-label="Search stories"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    {searchTerm && (
                        <button
                            type="button"
                            className="map-search-clear"
                            aria-label="Clear search"
                            onClick={() => setSearchTerm("")}
                        >
                            <i className="bi bi-x-lg"></i>
                        </button>
                    )}
                </div>

                {/* live status under the search field */}
                {isLoading && (
                    <div className="map-status">
                        <span className="map-status-dot" />
                        Loading stories…
                    </div>
                )}

                {!isLoading && loadError && (
                    <div className="map-status map-status-error">
                        <i className="bi bi-exclamation-triangle-fill"></i>
                        {loadError}
                    </div>
                )}

                {!isLoading && !loadError && (
                    <div className="map-status">
                        <i className="bi bi-geo-alt-fill"></i>
                        {filteredStories.length}{" "}
                        {filteredStories.length === 1 ? "story" : "stories"}
                        {activeCategory !== "all" &&
                            ` in ${getCategory(activeCategory).label}`}
                    </div>
                )}
                {!isLoading && !loadError && focusLocationLabel && !searchTerm.trim() &&
                    filteredStories.some((story) => story.id === focusStoryId) && (
                        <div className="map-status" role="status" aria-live="polite">
                            <i className="bi bi-stars" aria-hidden="true"></i>
                            <span>Approximate place (AI): {focusLocationLabel}</span>
                        </div>
                    )}
            </div>

            <MapContainer
                center={CYPRUS_CENTER}
                zoom={CYPRUS_ZOOM}
                maxBounds={CYPRUS_BOUNDS}
                maxBoundsViscosity={1.0}
                zoomControl={false}
                style={{ height: "100%", width: "100%" }}
            >
                <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                />

                {/* flies to a search match first, otherwise a story handed off
                    from the Browse tab's "locate" button */}
                <FlyToStory
                    story={
                        searchTerm.trim() && filteredStories.length > 0
                            ? filteredStories[0]
                            : stories.find((s) => s.id === focusStoryId) || null
                    }
                />

                <MarkerClusterGroup
                    chunkedLoading
                    showCoverageOnHover={false}
                    maxClusterRadius={48}
                    iconCreateFunction={createClusterIcon}
                >
                {filteredStories.map((story) => {
                    const category = getCategory(story.category);
                    const image = mediaUrl(story.image_url);
                    const audio = mediaUrl(story.audio_url);

                    return (
                        <Marker
                            key={story.id}
                            position={[Number(story.latitude), Number(story.longitude)]}
                            icon={getMarkerIcon(story.category)}
                        >
                            <Popup autoPanPaddingTopLeft={[24, 96]} autoPanPaddingBottomRight={[24, 24]}>
                                <article className="popup-card">
                                    {image ? (
                                        <div className="popup-image">
                                            <img src={image} alt={story.title} />
                                            <span
                                                className="cat-chip popup-chip"
                                                style={{ background: category.color }}
                                            >
                                                <i className={`bi ${category.icon}`}></i>
                                                {category.label}
                                            </span>
                                        </div>
                                    ) : (
                                        <div
                                            className="popup-image popup-image-empty"
                                            style={{ background: category.color }}
                                        >
                                            <i className={`bi ${category.icon}`}></i>
                                            <span className="cat-chip popup-chip popup-chip-solid">
                                                {category.label}
                                            </span>
                                        </div>
                                    )}

                                    <div className="popup-content">
                                        <h5>{story.title}</h5>
                                        <p>{getStoryPreview(story)}</p>

                                        {audio && (
                                            <audio controls preload="none" src={audio}>
                                                Your browser does not support audio playback.
                                            </audio>
                                        )}

                                        <Link to={`/story/${story.id}`} className="popup-btn">
                                            Read full story
                                            <i className="bi bi-arrow-right"></i>
                                        </Link>
                                    </div>
                                </article>
                            </Popup>
                        </Marker>
                    );
                })}
                </MarkerClusterGroup>

                <ZoomControl position="topright" />
                <ResetViewButton />
                <PopupWatcher onChange={setIsPopupOpen} />
            </MapContainer>

            {!isLoading && !loadError && (
                <MapLegend
                    counts={categoryCounts}
                    total={searchedStories.length}
                    activeCategory={activeCategory}
                    onCategoryChange={onCategoryChange}
                />
            )}

            {/* empty state when a filter or search returns nothing */}
            {!isLoading && !loadError && filteredStories.length === 0 && (
                <div className="map-empty">
                    <img src={Logo} alt="" className="map-empty-mark" />
                    <h5>No stories here yet</h5>
                    <p>
                        {searchTerm
                            ? "Try a different search term or clear the filter."
                            : "Be the first to add a story to this category."}
                    </p>
                    <Link to="/upload" className="map-empty-btn">
                        Share a story
                    </Link>
                </div>
            )}
        </div>
    );
}
