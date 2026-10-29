import Navbar from "../components/Navbar";
import Sidebar from "../components/Sidebar";
import MapView from "../components/MapView";
import "../assets/styles/mappage.css";
import { useLocation } from "react-router-dom";
import { useState } from "react";

// combines the navbar, sidebar, and map into the home page
export default function HomePage() {
    const location = useLocation();
    // a story handed off from the Browse tab's "locate" button -- forces the
    // category filter open so that story's marker is guaranteed to be visible
    const focusStoryId = location.state?.focusStoryId;
    const focusLocationLabel = location.state?.focusLocationLabel;

    // tracks the currently selected category from the sidebar -- defaults to
    // "all" so a story handed off from Browse is guaranteed to be in view
    const [activeCategory, setActiveCategory] = useState("all");
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    return (
        <div className="app-container">
            <Navbar />

            {/* opens the category drawer on small screens */}
            {!isSidebarOpen && (
                <button
                    className="menu-btn"
                    onClick={() => setIsSidebarOpen(true)}
                    aria-label="Open categories"
                >
                    <i className="bi bi-chevron-right"></i>
                </button>
            )}

            {/* lays out the sidebar beside the map */}
            <div className="main-layout d-flex">
                <div className={`sidebar-wrapper ${isSidebarOpen ? "open" : "closed"}`}>
                    <Sidebar
                        type="user"
                        onCategoryChange={(category) => {
                            setActiveCategory(category);
                            setIsSidebarOpen(false);
                        }}
                        activeCategory={activeCategory}
                        isOpen={isSidebarOpen}
                        onClose={() => setIsSidebarOpen(false)}
                    />
                </div>

                {/* shows the main map area */}
                <div className="map-wrapper flex-grow-1">
                    <MapView
                        activeCategory={activeCategory}
                        onCategoryChange={setActiveCategory}
                        focusStoryId={focusStoryId}
                        focusLocationLabel={focusLocationLabel}
                    />
                </div>

                {isSidebarOpen && (
                    <div className="overlay" onClick={() => setIsSidebarOpen(false)}></div>
                )}
            </div>
        </div>
    );
}
