// ============================================
// USER TRACKING SYSTEM - Noetika Dashboard
// ============================================

// Session tracking object
const trackingSession = {
    sessionId: generateSessionId(),
    startTime: new Date().toISOString(),
    userAgent: navigator.userAgent,
    screenResolution: `${window.screen.width}x${window.screen.height}`,
    language: navigator.language,
    referrer: document.referrer,
    events: [],
    ip: null,
    location: null
};

// Generate unique session ID
function generateSessionId() {
    return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

function normalizeIp(ip) {
    if (!ip) return '';
    let value = String(ip).trim();
    if (value.toLowerCase() === '::1') return '127.0.0.1';
    if (value.startsWith('::ffff:')) value = value.substring(7);
    return value;
}

function isLocalIp(ip) {
    const value = normalizeIp(ip).toLowerCase();
    if (!value) return true;
    if (value === '127.0.0.1' || value === 'localhost') return true;
    if (value.startsWith('10.')) return true;
    if (value.startsWith('192.168.')) return true;
    if (value.startsWith('169.254.')) return true;
    if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(value)) return true;
    if (value.startsWith('fc') || value.startsWith('fd')) return true; // IPv6 ULA
    if (value.startsWith('fe80')) return true; // IPv6 link-local
    return false;
}

function assignLocation(ip, rawData = {}) {
    const normalizedIp = normalizeIp(ip);
    trackingSession.ip = normalizedIp;
    const data = rawData || {};
    const location = {
        city: data.city || data.city_name || '',
        region: data.region || data.region_name || data.state || '',
        country: data.country || data.country_name || '',
        country_code: data.country_code || data.countryCode || '',
        latitude: data.latitude ?? data.lat ?? '',
        longitude: data.longitude ?? data.lon ?? '',
        timezone: data.timezone || data.time_zone || ''
    };
    Object.keys(location).forEach(key => {
        const value = location[key];
        location[key] = value === null || value === undefined ? '' : String(value);
    });
    trackingSession.location = location;
}

// Get user's IP and location (via backend to avoid CORS issues)
async function getUserLocation() {
    try {
        let locationResolved = false;
        let backendData = null;
        try {
            const response = await fetch('/api/get-location');
            if (response.ok) {
                backendData = await response.json();
            }
        } catch (backendError) {
            console.warn('⚠️ Backend location lookup falhou:', backendError.message);
        }

        if (backendData && backendData.ip) {
            const backendIp = normalizeIp(backendData.ip);
            if (!isLocalIp(backendIp)) {
                assignLocation(backendIp, backendData);
                locationResolved = true;
                console.log('✅ User location tracked via backend:', trackingSession.location);
            } else {
                console.warn('⚠️ Backend retornou IP local/reservado, tentando serviço externo.');
            }
        }
        
        if (!locationResolved) {
            try {
                const ipifyResponse = await fetch('https://api.ipify.org?format=json');
                if (ipifyResponse.ok) {
                    const ipifyData = await ipifyResponse.json();
                    const publicIp = normalizeIp(ipifyData.ip);
                    if (publicIp && !isLocalIp(publicIp)) {
                        let locationData = null;
                        try {
                            const geoResponse = await fetch(`https://ipapi.co/${publicIp}/json/`);
                            if (geoResponse.ok) {
                                const geoData = await geoResponse.json();
                                if (!geoData.error) {
                                    locationData = geoData;
                                }
                            }
                        } catch (geoError) {
                            console.warn('⚠️ Falha ao obter detalhes geográficos externos:', geoError.message);
                        }
                        assignLocation(publicIp, locationData || {});
                        locationResolved = true;
                        console.log('✅ User location rastreada via serviço externo:', trackingSession.location);
                    }
                }
            } catch (ipifyError) {
                console.warn('⚠️ Serviço externo de IP falhou:', ipifyError.message);
            }
        }

        if (!locationResolved) {
            const directEndpoints = [
                async () => {
                    const resp = await fetch('https://ipapi.co/json/');
                    if (resp.ok) {
                        const data = await resp.json();
                        if (data.ip && !data.error) return { ip: data.ip, payload: data };
                    }
                    return null;
                },
                async () => {
                    const resp = await fetch('https://ipinfo.io/json?token=8a8a9460b6d8ae');
                    if (resp.ok) {
                        const data = await resp.json();
                        if (data.ip) return { ip: data.ip, payload: data };
                    }
                    return null;
                },
                async () => {
                    const resp = await fetch('https://ip-api.com/json/?fields=status,message,country,countryCode,region,regionName,city,lat,lon,timezone,query');
                    if (resp.ok) {
                        const data = await resp.json();
                        if (data.status === 'success' && data.query) {
                            return {
                                ip: data.query,
                                payload: {
                                    city: data.city,
                                    region: data.regionName || data.region,
                                    country: data.country,
                                    country_code: data.countryCode,
                                    latitude: data.lat,
                                    longitude: data.lon,
                                    timezone: data.timezone
                                }
                            };
                        }
                    }
                    return null;
                },
                async () => {
                    const resp = await fetch('https://ipv6.icanhazip.com/');
                    if (resp.ok) {
                        const text = (await resp.text()).trim();
                        if (text) return { ip: text, payload: {} };
                    }
                    return null;
                }
            ];

            for (const getter of directEndpoints) {
                try {
                    const result = await getter();
                    if (result && result.ip) {
                        const publicIp = normalizeIp(result.ip);
                        if (publicIp && !isLocalIp(publicIp)) {
                            assignLocation(publicIp, result.payload || {});
                            locationResolved = true;
                            console.log('✅ User location rastreada via serviço alternativo:', trackingSession.location);
                            break;
                        }
                    }
                } catch (altError) {
                    console.warn('⚠️ Serviço alternativo de IP falhou:', altError.message);
                }
            }
        }

        if (locationResolved) {
            await updateSessionWithLocation();
            saveTrackingData();
            return;
        }
        
        // Fallback: try direct API (may fail due to CORS, but worth trying)
        try {
            const directResponse = await fetch('https://ipapi.co/json/');
            if (directResponse.ok) {
                const data = await directResponse.json();
                if (data.ip && !data.error) {
                    assignLocation(data.ip, data);
                    
                    console.log('✅ User location tracked via direct API:', trackingSession.location);
                    await updateSessionWithLocation();
                    saveTrackingData();
                    return;
                }
            }
        } catch (directError) {
            console.warn('⚠️ Direct API failed (expected due to CORS):', directError.message);
        }
        
        // If all fails, at least try to get IP
        console.warn('⚠️ Could not get full location data');
        trackingSession.location = { error: 'Location not available' };
        
    } catch (error) {
        console.error('❌ Failed to get user location:', error);
        trackingSession.location = { error: 'Location not available' };
    }
}

// Track page view
function trackPageView(page) {
    trackEvent('page_view', { page });
}

// Track any event
function trackEvent(eventType, eventData = {}) {
    const event = {
        type: eventType,
        timestamp: new Date().toISOString(),
        data: eventData,
        page: getCurrentPage()
    };
    
    trackingSession.events.push(event);
    
    // Log to console for debugging (only in dev)
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        console.log('📊 Event tracked:', event);
    }
    
    // Save to localStorage
    saveTrackingData();
    
    // Send to server (if available)
    sendToServer(event);
}

// Get current page/section identifier
function getCurrentPage() {
    const rankingSection = document.getElementById('rankingSection');
    const treeSection = document.getElementById('treeSection');
    const podium = document.querySelector('.podium');
    
    if (treeSection && treeSection.style.display !== 'none') {
        return 'tree';
    }
    if (rankingSection && rankingSection.style.display !== 'none') {
        return 'ranking';
    }
    if (podium) {
        return 'podium';
    }
    return 'input';
}

// Save tracking data to localStorage
function saveTrackingData() {
    try {
        localStorage.setItem('noetika_tracking_session', JSON.stringify(trackingSession));
    } catch (error) {
        console.error('Failed to save tracking data:', error);
    }
}

// Load tracking data from localStorage
function loadTrackingData() {
    try {
        const saved = localStorage.getItem('noetika_tracking_session');
        if (saved) {
            const data = JSON.parse(saved);
            // Only load if it's from today
            const savedDate = new Date(data.startTime).toDateString();
            const today = new Date().toDateString();
            if (savedDate === today) {
                return data;
            }
        }
    } catch (error) {
        console.error('Failed to load tracking data:', error);
    }
    return null;
}

// Send tracking data to server
async function sendToServer(event) {
    try {
        // Send to backend API
        const response = await fetch('/api/track', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                session: trackingSession, 
                event: event 
            })
        });
        
        if (!response.ok) {
            console.error('Server response not OK:', response.status);
        }
    } catch (error) {
        // If backend is not running, just log locally
        // Silent fail - don't spam console
    }
}

// Update session with location data when it becomes available
async function updateSessionWithLocation() {
    // If location is now available, send an update to the backend
    if (trackingSession.ip && trackingSession.location && !trackingSession.location.error) {
        try {
            await fetch('/api/track', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    session: trackingSession, 
                    event: { 
                        type: 'location_updated',
                        timestamp: new Date().toISOString(),
                        page: getCurrentPage(),
                        data: { ip: trackingSession.ip, location: trackingSession.location }
                    }
                })
            });
        } catch (error) {
            // Silent fail
        }
    }
}

// Track time spent on page
let pageStartTime = Date.now();
let totalTimeSpent = 0;

function updateTimeSpent() {
    const currentTime = Date.now();
    const timeOnPage = (currentTime - pageStartTime) / 1000; // seconds
    totalTimeSpent += timeOnPage;
    pageStartTime = currentTime;
    
    trackEvent('time_update', { 
        timeOnPage: Math.round(timeOnPage),
        totalTime: Math.round(totalTimeSpent)
    });
}

// Update time spent every 30 seconds
setInterval(updateTimeSpent, 30000);

// Track when user leaves page
window.addEventListener('beforeunload', () => {
    updateTimeSpent();
    trackEvent('session_end', { 
        totalDuration: Math.round(totalTimeSpent),
        totalEvents: trackingSession.events.length
    });
    
    // Try to send final data synchronously
    const payload = {
        session: trackingSession,
        event: { type: 'session_end', timestamp: new Date().toISOString() }
    };

    try {
        const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
        const sent = navigator.sendBeacon('/api/track', blob);

        if (!sent) {
            fetch('/api/track', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
                keepalive: true
            }).catch(() => {});
        }
    } catch (e) {
        try {
            fetch('/api/track', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
                keepalive: true
            }).catch(() => {});
        } catch (_) {
            // Ignore errors on page unload
        }
    }
});

// Track visibility changes (user switches tabs)
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        updateTimeSpent();
        trackEvent('page_hidden');
    } else {
        pageStartTime = Date.now();
        trackEvent('page_visible');
    }
});

// Track scroll depth
let maxScrollDepth = 0;

window.addEventListener('scroll', () => {
    const scrollPercentage = (window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100;
    
    if (scrollPercentage > maxScrollDepth) {
        maxScrollDepth = Math.round(scrollPercentage);
        
        // Track milestones: 25%, 50%, 75%, 100%
        if ([25, 50, 75, 100].includes(maxScrollDepth)) {
            trackEvent('scroll_depth', { depth: maxScrollDepth });
        }
    }
});

// Track clicks on buttons and interactive elements
document.addEventListener('click', (e) => {
    const target = e.target;
    const tagName = target.tagName.toLowerCase();
    
    // Track button clicks
    if (tagName === 'button' || target.classList.contains('btn')) {
        const buttonId = target.id || 'no-id';
        const buttonText = target.textContent.trim().substring(0, 50);
        trackEvent('button_click', {
            text: buttonText,
            id: buttonId,
            classes: target.className
        });
    }
    
    // Track triangle clicks
    if (target.id === 'tri' || target.closest('#tri')) {
        trackEvent('triangle_interaction', {
            element: 'canvas'
        });
    }
    
    // Track input changes (when clicking on number inputs)
    if (tagName === 'input' && target.type === 'number') {
        trackEvent('input_focus', {
            id: target.id,
            value: target.value
        });
    }
});

// Track input changes on triangle values
const inputElements = ['r', 'g', 'b'];
inputElements.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
        el.addEventListener('input', () => {
            trackEvent('priority_change', {
                field: id,
                value: parseFloat(el.value) || 0
            });
        });
    }
});

// Export tracking data as CSV
function exportTrackingDataCSV() {
    const headers = ['Session ID', 'Event Type', 'Timestamp', 'Page', 'Data'];
    const rows = trackingSession.events.map(event => [
        trackingSession.sessionId,
        event.type,
        event.timestamp,
        event.page,
        JSON.stringify(event.data)
    ]);
    
    const csv = [headers, ...rows]
        .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
        .join('\n');
    
    return csv;
}

// Export tracking data as JSON
function exportTrackingDataJSON() {
    return JSON.stringify(trackingSession, null, 2);
}

// Download tracking data
function downloadTrackingData(format = 'csv') {
    const data = format === 'csv' ? exportTrackingDataCSV() : exportTrackingDataJSON();
    const blob = new Blob([data], { type: format === 'csv' ? 'text/csv' : 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `noetika-tracking-${trackingSession.sessionId}.${format}`;
    a.click();
    URL.revokeObjectURL(url);
}

// ============================================
// INITIALIZE TRACKING
// ============================================

// Load existing session or create new one
const existingSession = loadTrackingData();
if (existingSession) {
    Object.assign(trackingSession, existingSession);
    console.log('📊 Loaded existing session:', trackingSession.sessionId);
}

// Get user location
getUserLocation();

// Track initial page view
trackPageView('input');

console.log('✅ Tracking initialized. Session ID:', trackingSession.sessionId);

// Export functions to window for debugging (only in dev)
if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    window.tracking = {
        session: trackingSession,
        exportCSV: () => downloadTrackingData('csv'),
        exportJSON: () => downloadTrackingData('json'),
        trackEvent: trackEvent
    };
    console.log('💡 Debug: Use window.tracking to access tracking functions');
}

