// ==========================================
// 1. DATABASE CONFIGURATION (SUPABASE)
// ==========================================
const SUPABASE_URL = "https://kxavdfwadbwnjqvbcfws.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt4YXZkZndhZGJ3bmpxdmJjZndzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAzNzU3NjgsImV4cCI6MjA5NTk1MTc2OH0.lwRtbTj1CHI_wk7dLU5_87Bzj1Ejk8DquRJB6PL4uB8";

// ==========================================
// 2. INITIALIZE TELEGRAM WEB APP CONTEXT Safely
// ==========================================
const tg = window.Telegram?.WebApp;

// Create clean safe fallback variables so it NEVER crashes outside of Telegram
let userA_Id = "999999";
let userA_FirstName = "Guest User";

if (tg) {
    try {
        tg.ready();
        tg.expand();

        // Safely extract Telegram data if it exists inside the framework
        if (tg.initDataUnsafe?.user) {
            userA_Id = tg.initDataUnsafe.user.id || "999999";
            userA_FirstName = tg.initDataUnsafe.user.first_name || "Guest User";
        }
    } catch (e) {
        console.error("Telegram WebApp initialization failed:", e);
    }
}

// Inject a personalized welcome title into the application layout header card safely
const welcomeElement = document.getElementById('welcome-text');
if (welcomeElement) {
    if (tg && tg.initDataUnsafe?.user) {
        const username = tg.initDataUnsafe.user.username;
        welcomeElement.innerText = `Hello, ${userA_FirstName}! (@${username || 'NoUsername'}) Arrange your custom appointment details below.`;
    } else {
        welcomeElement.innerText = `Testing Mode: Hello, ${userA_FirstName}! Arrange your custom appointment details below.`;
    }
}

// ==========================================
// 3. INITIALIZE FREE GOOGLE MAPS LAYER ENGINE
// ==========================================
let map;
let marker;

function initGoogleMapView() {
    // Default position coordinate view center array point (Defaults near Yangon center)
    const defaultPosition = [16.8409, 96.1735];

    // Create the core map viewer container object
    map = L.map('map').setView(defaultPosition, 13);

    // Inject the official Google Maps clean vector map tile skin matrix directly
    L.tileLayer('https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', {
        maxZoom: 20,
        subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
        attribution: 'Map data © <a href="https://maps.google.com">Google Maps</a>'
    }).addTo(map);

    // Create a striking, draggable meeting location pinpoint marker
    marker = L.marker(defaultPosition, { draggable: true }).addTo(markerLayerGroup(map));

    // Listen to where the user drags the marker map pin and record coordinate arrays
    updateHiddenCoordinates(defaultPosition[0], defaultPosition[1]);

    marker.on('dragend', function (event) {
        const position = marker.getLatLng();
        updateHiddenCoordinates(position.lat, position.lng);
    });
}

function updateHiddenCoordinates(lat, lng) {
    document.getElementById('latitude').value = lat;
    document.getElementById('longitude').value = lng;
}

// Utility wrapper helper to clean up marker object layers onto map arrays cleanly
function markerLayerGroup(mapObject) {
    const layerGroup = L.layerGroup().addTo(mapObject);
    return layerGroup;
}

// Spin up the visual map engine framework instantly on script evaluation
initGoogleMapView();

// ==========================================
// 4. SUBMIT ARRAY ROW PAYLOAD TO SUPABASE
// ==========================================
document.getElementById('submit-btn').addEventListener('click', async function (e) {
    e.preventDefault();

    // Select form data structures out of DOM nodes
    const receiverUsernameInput = document.getElementById('receiver-username').value.trim();
    const dateTimeValue = document.getElementById('date-time').value;
    const latitudeValue = parseFloat(document.getElementById('latitude').value);
    const longitudeValue = parseFloat(document.getElementById('longitude').value);
    const descriptionValue = document.getElementById('description').value.trim();

    // Basic form validation protection check gates
    if (!receiverUsernameInput || !dateTimeValue || !descriptionValue) {
        if (tg) {
            tg.showAlert("Please completely fill out all fields before sending the invitation request.");
        } else {
            alert("Please completely fill out all fields before sending the invitation request.");
        }
        return;
    }

    // Standardize text format username elements safely
    const formattedReceiver = receiverUsernameInput.startsWith('@') ? receiverUsernameInput : `@${receiverUsernameInput}`;

    // Build standard multi-user data payload block array row
    const payload = {
        sender_id: String(userA_Id),
        receiver_username: formattedReceiver,
        date_time: new Date(dateTimeValue).toISOString(),
        latitude: latitudeValue,
        longitude: longitudeValue,
        description: descriptionValue,
        status: "pending"
    };

    // Execute direct safe payload injection row request to cloud cluster API endpoints
        try {
            const response = await fetch(`${SUPABASE_URL}/rest/v1/meetings`, {
                method: 'POST',
                headers: {
                    'apikey': SUPABASE_ANON_KEY,
                    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                    'Content-Type': 'application/json',
                    'Prefer': 'return=minimal',
                    // 💡 CRITICAL FIX: Forces Supabase to look into your real 'public' table schema!
                    'Content-Profile': 'public',
                    'Accept-Profile': 'public'
                },
                body: JSON.stringify(payload)
            });

        if (response.ok) {
            // Success status confirmed! Close the app or notify user
            if (tg) {
                tg.showAlert(`🎉 Success! Your invite was sent to ${formattedReceiver}.`);
                setTimeout(() => {
                    tg.close();
                }, 1000);
            } else {
                alert(`🎉 Success! Your invite was sent to ${formattedReceiver}.`);
            }
        } else {
            // Read the exact error message text straight from Supabase
            const errorText = await response.text();
            console.error("Supabase Error Details:", errorText);
            
            // Show the raw database error on your screen so we can see it!
            if (tg) {
                tg.showAlert(`❌ Database Error: ${errorText}`);
            } else {
                alert(`❌ Database Error: ${errorText}`);
            }
        }
    } catch (error) {
        console.error("Network communication failure:", error);
        if (tg) {
            tg.showAlert("Network offline or cloud database rejected server transaction.");
        } else {
            alert("Network offline or cloud database rejected server transaction.");
        }
    }
});
