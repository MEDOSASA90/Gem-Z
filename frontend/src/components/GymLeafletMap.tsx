'use client';
import { useEffect, useRef } from 'react';
import 'leaflet/dist/leaflet.css';

interface Gym {
    id: number;
    name: string;
    nameAr: string;
    area: string;
    areaAr: string;
    city: string;
    cityAr: string;
    rating: number;
    reviews: number;
    distance: string;
    price: number;
    priceMonthly: number;
    discount: number;
    discountReason: string;
    discountReasonAr: string;
    features: string[];
    open: string;
    phone: string;
    isOpen: boolean;
    isFeatured: boolean;
    color: string;
    emoji: string;
    lat: number;
    lng: number;
}

interface Store {
    id: number;
    name: string;
    nameAr: string;
    area: string;
    areaAr: string;
    city: string;
    cityAr: string;
    rating: number;
    reviews: number;
    distance: string;
    open: string;
    phone: string;
    isOpen: boolean;
    isFeatured: boolean;
    color: string;
    emoji: string;
    lat: number;
    lng: number;
    discount: number;
    discountReason: string;
    discountReasonAr: string;
}

interface GymLeafletMapProps {
    gyms: Gym[];
    stores: Store[];
    selectedGymId: number | null;
    selectedStoreId: number | null;
    isArabic: boolean;
    isDark: boolean;
    onGymSelect: (gym: Gym) => void;
    onStoreSelect: (store: Store) => void;
}

export default function GymLeafletMap({ gyms, stores, selectedGymId, selectedStoreId, isArabic, isDark, onGymSelect, onStoreSelect }: GymLeafletMapProps) {
    const mapRef = useRef<HTMLDivElement>(null);
    const mapInstanceRef = useRef<import('leaflet').Map | null>(null);
    const gymMarkersRef = useRef<Map<number, import('leaflet').Marker>>(new Map());
    const storeMarkersRef = useRef<Map<number, import('leaflet').Marker>>(new Map());
    const isInitializingRef = useRef(false);

    useEffect(() => {
        if (!mapRef.current || mapInstanceRef.current || isInitializingRef.current) return;
        isInitializingRef.current = true;

        // Dynamic import to avoid SSR issues
        import('leaflet').then((L) => {
            if (!mapRef.current || mapInstanceRef.current) {
                isInitializingRef.current = false;
                return;
            }
            // Fix default icon paths broken by webpack
            // @ts-expect-error leaflet internal
            delete L.Icon.Default.prototype._getIconUrl;
            L.Icon.Default.mergeOptions({
                iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
                iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
                shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
            });

            const map = L.map(mapRef.current!, {
                center: [30.05, 31.23],
                zoom: 11,
                zoomControl: true,
            });

            // Dark-style tile layer
            const tileUrl = isDark
                ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
                : 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';

            L.tileLayer(tileUrl, {
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>',
                maxZoom: 19,
            }).addTo(map);

            // Add gym markers
            gyms.forEach((gym) => {
                const icon = L.divIcon({
                    className: '',
                    html: `
                        <div style="
                            background: ${gym.color};
                            width: 42px; height: 42px;
                            border-radius: 12px;
                            display: flex; align-items: center; justify-content: center;
                            font-size: 20px;
                            box-shadow: 0 4px 15px ${gym.color}60;
                            border: 2px solid rgba(255,255,255,0.3);
                            cursor: pointer;
                            transition: transform 0.2s;
                            position: relative;
                        ">
                            ${gym.emoji}
                            ${gym.discount > 0 ? `<div style="
                                position: absolute; top: -8px; right: -8px;
                                background: #FF3B30; color: white;
                                border-radius: 50%; width: 20px; height: 20px;
                                font-size: 9px; font-weight: bold;
                                display: flex; align-items: center; justify-content: center;
                            ">-${gym.discount}%</div>` : ''}
                        </div>
                    `,
                    iconSize: [42, 42],
                    iconAnchor: [21, 21],
                    popupAnchor: [0, -25],
                });

                const marker = L.marker([gym.lat, gym.lng], { icon });

                marker.on('click', () => {
                    onGymSelect(gym);
                });

                const popupContent = `
                    <div style="font-family: system-ui; min-width: 180px; padding: 4px;">
                        <div style="display:flex; align-items:center; gap:8px; margin-bottom:6px;">
                            <span style="font-size:24px;">${gym.emoji}</span>
                            <div>
                                <p style="font-weight:700; margin:0; font-size:14px;">${isArabic ? gym.nameAr : gym.name}</p>
                                <p style="color:#888; margin:0; font-size:11px;">📍 ${isArabic ? gym.areaAr : gym.area}</p>
                            </div>
                        </div>
                        <div style="display:flex; justify-content:space-between; align-items:center;">
                            <span style="color:#FFCC00; font-size:12px;">⭐ ${gym.rating}</span>
                            <span style="color:${gym.color}; font-weight:700; font-size:13px;">
                                EGP ${gym.discount > 0 ? Math.round(gym.price * (1 - gym.discount / 100)) : gym.price}/mo
                            </span>
                        </div>
                        ${gym.discount > 0 ? `<p style="color:#FF3B30; font-size:11px; margin-top:4px; font-weight:700;">🏷 ${gym.discount}% OFF — ${isArabic ? gym.discountReasonAr : gym.discountReason}</p>` : ''}
                        <div style="margin-top:6px;">
                            <span style="
                                background: ${gym.isOpen ? 'rgba(52,199,89,0.15)' : 'rgba(100,100,100,0.15)'};
                                color: ${gym.isOpen ? '#34C759' : '#888'};
                                padding: 2px 8px; border-radius: 20px; font-size: 11px; font-weight: 700;
                            ">${gym.isOpen ? (isArabic ? 'مفتوح' : 'Open') : (isArabic ? 'مغلق' : 'Closed')}</span>
                        </div>
                    </div>
                `;

                marker.bindPopup(popupContent, { maxWidth: 240 });
                marker.addTo(map);
                gymMarkersRef.current.set(gym.id, marker);
            });

            // Add store markers
            stores.forEach((store) => {
                const icon = L.divIcon({
                    className: '',
                    html: `
                        <div style="
                            background: ${store.color};
                            width: 36px; height: 36px;
                            border-radius: 50%;
                            display: flex; align-items: center; justify-content: center;
                            font-size: 16px;
                            box-shadow: 0 4px 15px ${store.color}60;
                            border: 2px solid white;
                            cursor: pointer;
                            transition: transform 0.2s;
                            position: relative;
                        ">
                            ${store.emoji}
                            ${store.discount > 0 ? `<div style="
                                position: absolute; top: -6px; right: -6px;
                                background: #FF3B30; color: white;
                                border-radius: 50%; width: 18px; height: 18px;
                                font-size: 8px; font-weight: bold;
                                display: flex; align-items: center; justify-content: center;
                            ">-${store.discount}%</div>` : ''}
                        </div>
                    `,
                    iconSize: [36, 36],
                    iconAnchor: [18, 18],
                    popupAnchor: [0, -20],
                });

                const marker = L.marker([store.lat, store.lng], { icon });

                marker.on('click', () => {
                    onStoreSelect(store);
                });

                const popupContent = `
                    <div style="font-family: system-ui; min-width: 180px; padding: 4px;">
                        <div style="display:flex; align-items:center; gap:8px; margin-bottom:6px;">
                            <span style="font-size:24px;">${store.emoji}</span>
                            <div>
                                <p style="font-weight:700; margin:0; font-size:14px;">${isArabic ? store.nameAr : store.name}</p>
                                <p style="color:#888; margin:0; font-size:11px;">📍 ${isArabic ? store.areaAr : store.area} (Store)</p>
                            </div>
                        </div>
                        <div style="display:flex; justify-content:space-between; align-items:center;">
                            <span style="color:#FFCC00; font-size:12px;">⭐ ${store.rating} (${store.reviews})</span>
                        </div>
                        ${store.discount > 0 ? `<p style="color:#FF3B30; font-size:11px; margin-top:4px; font-weight:700;">🏷 ${store.discount}% OFF — ${isArabic ? store.discountReasonAr : store.discountReason}</p>` : ''}
                        <div style="margin-top:6px;">
                            <span style="
                                background: ${store.isOpen ? 'rgba(52,199,89,0.15)' : 'rgba(100,100,100,0.15)'};
                                color: ${store.isOpen ? '#34C759' : '#888'};
                                padding: 2px 8px; border-radius: 20px; font-size: 11px; font-weight: 700;
                            ">${store.isOpen ? (isArabic ? 'مفتوح' : 'Open') : (isArabic ? 'مغلق' : 'Closed')}</span>
                        </div>
                    </div>
                `;

                marker.bindPopup(popupContent, { maxWidth: 240 });
                marker.addTo(map);
                storeMarkersRef.current.set(store.id, marker);
            });

            // "You are here" marker
            const youIcon = L.divIcon({
                className: '',
                html: `
                    <div style="
                        width: 20px; height: 20px; border-radius: 50%;
                        background: #00B8FF; border: 4px solid white;
                        box-shadow: 0 0 0 6px rgba(0,184,255,0.2), 0 4px 15px rgba(0,184,255,0.4);
                    "/>
                `,
                iconSize: [20, 20],
                iconAnchor: [10, 10],
            });
            L.marker([30.05, 31.23], { icon: youIcon })
                .bindTooltip(isArabic ? 'أنت هنا' : 'You are here', { permanent: true, direction: 'top', offset: [0, -12] })
                .addTo(map);

            mapInstanceRef.current = map;
            isInitializingRef.current = false;
        });

        return () => {
            if (mapInstanceRef.current) {
                mapInstanceRef.current.remove();
                mapInstanceRef.current = null;
            }
            isInitializingRef.current = false;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isDark]); // Re-initialize map if theme changes to reload tiles properly

    // Handle marker selection changes dynamically without re-initializing the whole map
    useEffect(() => {
        // Close any open popup first
        if (mapInstanceRef.current) {
            mapInstanceRef.current.closePopup();
        }

        if (selectedGymId !== null) {
            const marker = gymMarkersRef.current.get(selectedGymId);
            if (marker && mapInstanceRef.current) {
                marker.openPopup();
                mapInstanceRef.current.panTo(marker.getLatLng(), { animate: true });
            }
        } else if (selectedStoreId !== null) {
            const marker = storeMarkersRef.current.get(selectedStoreId);
            if (marker && mapInstanceRef.current) {
                marker.openPopup();
                mapInstanceRef.current.panTo(marker.getLatLng(), { animate: true });
            }
        }
    }, [selectedGymId, selectedStoreId]);

    // Handle showing/hiding markers based on gyms/stores props
    useEffect(() => {
        if (!mapInstanceRef.current) return;
        const currentGymIds = new Set(gyms.map(g => g.id));
        const currentStoreIds = new Set(stores.map(s => s.id));

        gymMarkersRef.current.forEach((marker, id) => {
            if (currentGymIds.has(id)) {
                if (!mapInstanceRef.current?.hasLayer(marker)) marker.addTo(mapInstanceRef.current!);
            } else {
                marker.remove();
            }
        });

        storeMarkersRef.current.forEach((marker, id) => {
            if (currentStoreIds.has(id)) {
                if (!mapInstanceRef.current?.hasLayer(marker)) marker.addTo(mapInstanceRef.current!);
            } else {
                marker.remove();
            }
        });
    }, [gyms, stores]);

    return <div ref={mapRef} style={{ width: '100%', height: '100%' }} />;
}
