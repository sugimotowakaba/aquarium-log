'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import dynamic from 'next/dynamic';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useMap as useLeafletMap } from 'react-leaflet';

// Leaflet アイコンのパス調整
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png';
import iconUrl from 'leaflet/dist/images/marker-icon.png';
import shadowUrl from 'leaflet/dist/images/marker-shadow.png';
L.Icon.Default.mergeOptions({ iconRetinaUrl, iconUrl, shadowUrl });

// Map系は SSR 無効で読み込み
const MapContainer = dynamic(() => import('react-leaflet').then(m => m.MapContainer), { ssr: false });
const TileLayer    = dynamic(() => import('react-leaflet').then(m => m.TileLayer),    { ssr: false });
const Marker       = dynamic(() => import('react-leaflet').then(m => m.Marker),       { ssr: false });
const Popup        = dynamic(() => import('react-leaflet').then(m => m.Popup),        { ssr: false });
const CircleMarker = dynamic(() => import('react-leaflet').then(m => m.CircleMarker), { ssr: false });

type Aq = {
  id: string;
  name: string;
  lat: number | null;
  lng: number | null;
  prefecture: string | null;
  official_url: string | null;
};

function FitOnData({ points }: { points: { lat: number; lng: number }[] }) {
  const map = useLeafletMap();
  useEffect(() => {
    if (!map || points.length === 0) return;
    const b = L.latLngBounds(points.map(p => [p.lat, p.lng] as [number, number]));
    map.fitBounds(b.pad(0.1), { animate: false });
  }, [map, points]);
  return null;
}

// Haversine
function distanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const la1 = (a.lat * Math.PI) / 180;
  const la2 = (b.lat * Math.PI) / 180;
  const s = Math.sin(dLat/2)**2 + Math.sin(dLng/2)**2 * Math.cos(la1) * Math.cos(la2);
  return R * (2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s)));
}

export default function AquariumMap() {
  const [list, setList] = useState<Aq[]>([]);
  const [loading, setLoading] = useState(true);
  const [geo, setGeo] = useState<{ lat: number; lng: number } | null>(null);
  const [_geoError, setGeoError] = useState<string | null>(null);
  const [asking, setAsking] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('aquariums')
        .select('id,name,lat,lng,prefecture,official_url')
        .not('lat', 'is', null)
        .not('lng', 'is', null);
      setList((data ?? []) as Aq[]);
      setLoading(false);
    })();
    getGeo();
  }, []);

  const getGeo = () => {
    if (!('geolocation' in navigator)) {
      setGeoError('このブラウザは位置情報に対応していません');
      return;
    }
    setAsking(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => { setGeo({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setAsking(false); },
      (err) => { setGeo(null); setGeoError(err.message); setAsking(false); },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  const points = useMemo(
    () => list.filter(a => a.lat != null && a.lng != null).map(a => ({ lat: a.lat!, lng: a.lng! })),
    [list]
  );

  const nearby = useMemo(() => {
    if (!geo) return [];
    return list
      .filter(a => a.lat != null && a.lng != null)
      .map(a => ({ ...a, distance: distanceKm(geo, { lat: a.lat!, lng: a.lng! }) }))
      .sort((x, y) => (x.distance! - y.distance!));
  }, [list, geo]);

  const initialCenter: [number, number] = [35.681236, 139.767125];
  const initialZoom = 5;

  return (
    <div className="space-y-4">
      <div className="w-full h-[60vh] rounded-2xl overflow-hidden border">
        <MapContainer center={initialCenter} zoom={initialZoom} style={{ width: '100%', height: '100%' }}>
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          />
          {list.map(a => (a.lat != null && a.lng != null) ? (
            <Marker key={a.id} position={[a.lat, a.lng]}>
              <Popup>
                <div className="space-y-1">
                  <div className="font-medium">{a.name}</div>
                  <div className="text-sm text-gray-600">{a.prefecture ?? ''}</div>
                  {geo && (
                    <div className="text-xs text-gray-600">
                      現在地から約 {distanceKm(geo, {lat: a.lat!, lng: a.lng!}).toFixed(1)} km
                    </div>
                  )}
                  <div className="flex gap-3 mt-1">
                    <a className="underline text-sm" href={`/visits/new?aquarium=${a.id}`}>ここで記録</a>
                    {a.official_url && (
                      <a className="underline text-sm" href={a.official_url} target="_blank" rel="noreferrer">公式</a>
                    )}
                  </div>
                </div>
              </Popup>
            </Marker>
          ) : null)}
          {geo && (
            <CircleMarker center={[geo.lat, geo.lng]} radius={8} pathOptions={{ color: '#2563eb' }}>
              <Popup>現在地</Popup>
            </CircleMarker>
          )}
          {!loading && points.length > 0 ? <FitOnData points={points} /> : null}
        </MapContainer>
      </div>

      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">近くの水族館（距離順）</h2>
          <button onClick={getGeo} className="text-sm underline" disabled={asking}>
            {asking ? '現在地を取得中…' : '現在地を取得'}
          </button>
        </div>

        <ul className="divide-y rounded-xl border overflow-hidden">
          {(geo ? nearby : [...list].sort((a, b) => {
            const pa = a.prefecture || '', pb = b.prefecture || '';
            return pa.localeCompare(pb, 'ja') || a.name.localeCompare(b.name, 'ja');
          }))
          .slice(0, 30)
          .map(a => {
            const dist = geo && a.lat != null && a.lng != null
              ? distanceKm(geo, { lat: a.lat!, lng: a.lng! }).toFixed(1)
              : null;
            return (
              <li key={a.id} className="p-3 flex items-center justify-between gap-3">
                <div>
                  <div className="font-medium">{a.name}</div>
                  <div className="text-sm text-gray-600">
                    {a.prefecture ?? '—'}{dist ? ` ・ ${dist} km` : ''}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <a className="text-sm underline" href={`/visits/new?aquarium=${a.id}`}>記録する</a>
                  {a.official_url && <a className="text-sm underline" href={a.official_url} target="_blank" rel="noreferrer">公式</a>}
                </div>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
