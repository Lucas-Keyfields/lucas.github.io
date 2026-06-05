// ==========================================
// 1. DATABASE CONFIGURATION (SUPABASE)
// ==========================================
const SUPABASE_URL = "https://kxavdfwadbwnjqvbcfws.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt4YXZkZndhZGJ3bmpxdmJjZndzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAzNzU3NjgsImV4cCI6MjA5NTk1MTc2OH0.lwRtbTj1CHI_wk7dLU5_87Bzj1Ejk8DquRJB6PL4uB8";

// ==========================================
// 2. INITIALIZE TELEGRAM WEB APP CONTEXT Safely
// ==========================================
const tg = window.Telegram?.WebApp;

let userA_Id = "999999";
let userA_FirstName = "Guest User";

if (tg) {
    try {
        tg.ready();
        tg.expand();
        if (tg.initDataUnsafe?.user) {
            userA_Id = tg.initDataUnsafe.user.id || "999999";
            userA_FirstName = tg.initDataUnsafe.user.first_name || "Guest User";
        }
    } catch (e) {
        console.error("Telegram WebApp initialization failed:", e);
    }
}

// Global UI Elements references
const welcomeElement = document.getElementById('welcome-text');
const navRequestBtn = document.getElementById('nav-request-btn');
const navListBtn = document.getElementById('nav-list-btn');
const requestTab = document.getElementById('request-tab');
const listTab = document.getElementById('list-tab');
const detailsTab = document.getElementById('details-tab');
const backToListBtn = document.getElementById('back-to-list-btn');

if (welcomeElement) {
    if (tg && tg.initDataUnsafe?.user) {
        const username = tg.initDataUnsafe.user.username;
        welcomeElement.innerText = `Hello, ${userA_FirstName}! (@${username || 'NoUsername'}) Arrange your custom appointment details below.`;
    } else {
        welcomeElement.innerText = `Testing Mode: Hello, ${userA_FirstName}! Arrange your custom appointment details below.`;
    }
}

// ==========================================
// 3. INITIALIZE FREE MAP LAYERS ENGINE
// ==========================================
let map, marker;
let detailsMap, detailsMarker; // Dedicated map elements for layout view

function initMaps() {
    const defaultPosition = [16.8409, 96.1735];
    
    // 🗺️ Map 1: The Request Creation Form Map
    map = L.map('map').setView(defaultPosition, 13);
    L.tileLayer('https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', {
        maxZoom: 20, subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
        attribution: 'Map data © Google Maps'
    }).addTo(map);
    marker = L.marker(defaultPosition, { draggable: true }).addTo(map);
    updateHiddenCoordinates(defaultPosition[0], defaultPosition[1]);
    marker.on('dragend', function () {
        const pos = marker.getLatLng();
        updateHiddenCoordinates(pos.lat, pos.lng);
    });

    // 🗺️ Map 2: The Dedicated Details Viewer Map (Locked/Static Pin)
    detailsMap = L.map('details-map').setView(defaultPosition, 13);
    L.tileLayer('https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', {
        maxZoom: 20, subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
        attribution: 'Map data © Google Maps'
    }).addTo(detailsMap);
    detailsMarker = L.marker(defaultPosition, { draggable: false }).addTo(detailsMap);
}

function updateHiddenCoordinates(lat, lng) {
    const latInput = document.getElementById('latitude');
    const lngInput = document.getElementById('longitude');
    if (latInput) latInput.value = lat;
    if (lngInput) lngInput.value = lng;
}

initMaps();

// ==========================================
// 4. SUBMIT ARRAY ROW PAYLOAD TO SUPABASE
// ==========================================
document.getElementById('date-form')?.addEventListener('submit', async function (e) {
    e.preventDefault();

    const receiverUsernameInput = document.getElementById('receiver-username').value.trim();
    const dateTimeValue = document.getElementById('date-time').value;
    const latitudeValue = parseFloat(document.getElementById('latitude').value);
    const longitudeValue = parseFloat(document.getElementById('longitude').value);
    const descriptionValue = document.getElementById('description').value.trim();

    if (!receiverUsernameInput || !dateTimeValue || !descriptionValue) {
        if (tg) tg.showAlert("Please completely fill out all fields before sending the invitation request.");
        else alert("Please completely fill out all fields before sending the invitation request.");
        return;
    }

    const formattedReceiver = receiverUsernameInput.startsWith('@') ? receiverUsernameInput : `@${receiverUsernameInput}`;

    const payload = {
        sender_id: String(userA_Id),
        receiver_username: formattedReceiver,
        date_time: new Date(dateTimeValue).toISOString(),
        latitude: latitudeValue,
        longitude: longitudeValue,
        description: descriptionValue,
        status: "pending"
    };

    try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/meetings`, {
            method: 'POST',
            headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=minimal',
                'Content-Profile': 'public',
                'Accept-Profile': 'public'
            },
            body: JSON.stringify(payload)
        });

        if (response.ok) {
            if (tg) {
                tg.showAlert(`🎉 Success! Your invite was sent to ${formattedReceiver}.`);
                setTimeout(() => { tg.close(); }, 1000);
            } else {
                alert(`🎉 Success! Your invite was sent to ${formattedReceiver}.`);
            }
        } else {
            const errorText = await response.text();
            if (tg) tg.showAlert(`❌ Database Error: ${errorText}`);
            else alert(`❌ Database Error: ${errorText}`);
        }
    } catch (error) {
        if (tg) tg.showAlert("Network offline or cloud database rejected server transaction.");
        else alert("Network offline or cloud database rejected server transaction.");
    }
});

// ==========================================
// 5. RECEIVER MODE LAYER: PARSE INCOMING URL LINKS
// ==========================================
function checkReceiverMode() {
    const urlParams = new URLSearchParams(window.location.search);
    const latParam = urlParams.get('lat');
    const lngParam = urlParams.get('lng');
    const descParam = urlParams.get('desc');
    const timeParam = urlParams.get('time');

    if (latParam && lngParam) {
        const targetLat = parseFloat(latParam);
        const targetLng = parseFloat(lngParam);

        map.setView([targetLat, targetLng], 16);
        marker.setLatLng([targetLat, targetLng]);
        marker.dragging.disable();

        if (requestTab) {
            const formGroups = requestTab.querySelectorAll('.form-group');
            formGroups.forEach(group => {
                if (!group.contains(document.getElementById('map'))) {
                    group.style.display = 'none';
                }
            });
            const submitBtn = document.getElementById('submit-btn');
            if (submitBtn) submitBtn.style.display = 'none';
        }
        
        const bottomNav = document.querySelector('.bottom-nav');
        if (bottomNav) bottomNav.style.display = 'none';

        if (welcomeElement) {
            welcomeElement.innerHTML = `
                <div style="background: rgba(36, 129, 204, 0.1); padding: 14px; border-radius: 10px; border: 1px solid var(--tg-theme-button-color, #2481cc); margin-bottom: 5px;">
                    <h3 style="color: var(--tg-theme-text-color, #000000); font-size: 16px; margin-bottom: 8px;">📅 Invitation Details</h3>
                    <p style="font-size: 14px; margin-bottom: 4px;"><strong>🕒 When:</strong> ${decodeURIComponent(timeParam || 'Not specified')}</p>
                    <p style="font-size: 14px; margin-bottom: 0;"><strong>📝 Note:</strong> "${decodeURIComponent(descParam || 'No description provided')}"</p>
                </div>
            `;
        }
    }
}

checkReceiverMode();

// ==========================================
// 6. LAYOUT NAVIGATION MANAGER (TAB SWITCHING)
// ==========================================
if (navRequestBtn && navListBtn && requestTab && listTab && detailsTab) {
    navRequestBtn.addEventListener('click', () => {
        requestTab.style.display = 'block';
        listTab.style.display = 'none';
        detailsTab.style.display = 'none';
        navRequestBtn.style.color = 'var(--tg-theme-button-color, #2481cc)';
        navListBtn.style.color = 'var(--tg-theme-hint-color, #8e8e93)';
        setTimeout(() => { map.invalidateSize(); }, 100);
    });

    navListBtn.addEventListener('click', () => {
        requestTab.style.display = 'none';
        listTab.style.display = 'block';
        detailsTab.style.display = 'none';
        navRequestBtn.style.color = 'var(--tg-theme-hint-color, #8e8e93)';
        navListBtn.style.color = 'var(--tg-theme-button-color, #2481cc)';
        loadAppointmentsFromDb();
    });

    // Back to List interaction link logic
    backToListBtn?.addEventListener('click', () => {
        requestTab.style.display = 'none';
        listTab.style.display = 'block';
        detailsTab.style.display = 'none';
    });
}

// Fetch user data rows straight from Supabase endpoint REST layers
async function loadAppointmentsFromDb() {
    const container = document.getElementById('appointments-container');
    const loadingText = document.getElementById('appointments-loading');
    
    if (!container || !loadingText) return;
    
    container.innerHTML = '';
    loadingText.style.display = 'block';

    try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/meetings?sender_id=eq.${userA_Id}&order=date_time.desc`, {
            method: 'GET',
            headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                'Content-Profile': 'public',
                'Accept-Profile': 'public'
            }
        });

        if (!response.ok) throw new Error("Database query matrix fetch failed.");

        const data = await response.json();
        loadingText.style.display = 'none';

        if (data.length === 0) {
            container.innerHTML = `<p style="color: var(--tg-theme-hint-color, #8e8e93); text-align: center; margin-top: 30px; font-size: 14px;">No scheduled appointments found.</p>`;
            return;
        }

        data.forEach(meet => {
            const dateStr = new Date(meet.date_time).toLocaleString();
            const card = document.createElement('div');
            card.className = 'appointment-card';
            card.innerHTML = `
                <h4>Invited User: ${meet.receiver_username}</h4>
                <p><strong>📝 Reason:</strong> "${meet.description}"</p>
                <p><strong>🕒 Scheduled:</strong> ${dateStr}</p>
                <p><strong>📍 Status:</strong> <span style="color: #fbbf24; font-weight: bold;">${meet.status.toUpperCase()}</span></p>
                <button class="view-details-btn" style="margin-top: 10px; width: 100%; padding: 10px; background: var(--tg-theme-button-color, #2481cc); color: var(--tg-theme-button-text-color, #fff); border: none; border-radius: 8px; font-weight: bold; font-size: 14px; cursor: pointer;">
                    🔍 View Full Details
                </button>
            `;

            const viewBtn = card.querySelector('.view-details-btn');
            viewBtn.addEventListener('click', () => {
                const targetLat = parseFloat(meet.latitude);
                const targetLng = parseFloat(meet.longitude);

                if (!isNaN(targetLat) && !isNaN(targetLng) && requestTab && listTab && detailsTab) {
                    // 💡 CRITICAL: Open the separate Read-Only details panel layout tab!
                    requestTab.style.display = 'none';
                    listTab.style.display = 'none';
                    detailsTab.style.display = 'block';

                    // Inject values inside the read-only information container
                    const infoCard = document.getElementById('detailed-info-card');
                    if (infoCard) {
                        infoCard.innerHTML = `
                            <p style="margin-bottom:8px; font-size:15px;"><strong style="color:var(--tg-theme-hint-color, #888);">👤 Recipient:</strong> ${meet.receiver_username}</p>
                            <p style="margin-bottom:8px; font-size:15px;"><strong style="color:var(--tg-theme-hint-color, #888);">🕒 Date/Time:</strong> ${dateStr}</p>
                            <p style="margin-bottom:8px; font-size:15px;"><strong style="color:var(--tg-theme-hint-color, #888);">📝 Description:</strong> "${meet.description}"</p>
                            <p style="margin-bottom:0; font-size:15px;"><strong style="color:var(--tg-theme-hint-color, #888);">⚡ Appointment Status:</strong> <span style="color: #fbbf24; font-weight: bold;">${meet.status.toUpperCase()}</span></p>
                        `;
                    }

                    // Boot separate static view map layer
                    setTimeout(() => {
                        detailsMap.invalidateSize();
                        detailsMap.setView([targetLat, targetLng], 16);
                        detailsMarker.setLatLng([targetLat, targetLng]);
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                    }, 100);
                } else {
                    alert("Error processing saved row coordinates.");
                }
            });

            container.appendChild(card);
        });

    } catch (error) {
        console.error("Failed loading rows:", error);
        loadingText.innerText = "❌ Failed loading lists from cloud storage parameters.";
    }
}
