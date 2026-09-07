import React, { useState, useEffect } from 'react';
import { MapPin, ZoomIn, ZoomOut, Move, RefreshCw, Home, ExternalLink, X, Compass, Layers } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Link } from 'wouter';

export interface MapPropertyItem {
  id: string;
  title: string;
  price: string;
  priceNum: number;
  location: string;
  typeLabel: string;
  area: number;
  rooms: number;
  image: string;
  lat: number;
  lng: number;
}

interface RealEstateMapSearchProps {
  properties: MapPropertyItem[];
  currentCity?: string;
  onSearchInArea?: (bounds: { latMin: number; latMax: number; lngMin: number; lngMax: number }) => void;
  onSelectProperty?: (prop: MapPropertyItem) => void;
  className?: string;
}

export const RealEstateMapSearch: React.FC<RealEstateMapSearchProps> = ({
  properties,
  currentCity = 'Miskolc',
  onSearchInArea,
  onSelectProperty,
  className = '',
}) => {
  const [zoomLevel, setZoomLevel] = useState<number>(13);
  const [hasMoved, setHasMoved] = useState<boolean>(false);
  const [selectedProperty, setSelectedProperty] = useState<MapPropertyItem | null>(null);
  const [mapCenter, setMapCenter] = useState({ lat: 48.1035, lng: 20.7784 }); // Miskolc center default
  const [isSearchingArea, setIsSearchingArea] = useState<boolean>(false);

  // Update center when city changes
  useEffect(() => {
    if (currentCity.toLowerCase().includes('debrecen')) {
      setMapCenter({ lat: 47.5316, lng: 21.6273 });
    } else if (currentCity.toLowerCase().includes('budapest')) {
      setMapCenter({ lat: 47.4979, lng: 19.0402 });
    } else if (currentCity.toLowerCase().includes('kazinc')) {
      setMapCenter({ lat: 48.2522, lng: 20.6273 });
    } else {
      setMapCenter({ lat: 48.1035, lng: 20.7784 });
    }
    setHasMoved(false);
  }, [currentCity]);

  const handleZoomIn = () => {
    if (zoomLevel < 18) {
      setZoomLevel((prev) => prev + 1);
      setHasMoved(true);
    }
  };

  const handleZoomOut = () => {
    if (zoomLevel > 8) {
      setZoomLevel((prev) => prev - 1);
      setHasMoved(true);
    }
  };

  const handlePanMap = (direction: 'up' | 'down' | 'left' | 'right') => {
    const delta = 0.015 * (15 / zoomLevel);
    setMapCenter((prev) => {
      let lat = prev.lat;
      let lng = prev.lng;
      if (direction === 'up') lat += delta;
      if (direction === 'down') lat -= delta;
      if (direction === 'right') lng += delta;
      if (direction === 'left') lng -= delta;
      return { lat, lng };
    });
    setHasMoved(true);
  };

  const handleSearchThisArea = () => {
    setIsSearchingArea(true);
    setTimeout(() => {
      setIsSearchingArea(false);
      setHasMoved(false);
      if (onSearchInArea) {
        onSearchInArea({
          latMin: mapCenter.lat - 0.05,
          latMax: mapCenter.lat + 0.05,
          lngMin: mapCenter.lng - 0.05,
          lngMax: mapCenter.lng + 0.05,
        });
      }
    }, 600);
  };

  return (
    <div className={`relative w-full h-[520px] rounded-3xl overflow-hidden border border-slate-800 bg-slate-950 shadow-2xl ${className}`}>
      {/* Visual Simulated Map Canvas with Grid Lines */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center overflow-hidden">
        {/* Map Grid Pattern & Topographic Overlay */}
        <div
          className="absolute inset-0 opacity-20 pointer-events-none transition-transform duration-500"
          style={{
            backgroundImage: `radial-gradient(#10b981 1px, transparent 1px), linear-gradient(to right, #334155 1px, transparent 1px), linear-gradient(to bottom, #334155 1px, transparent 1px)`,
            backgroundSize: `${30 * (zoomLevel / 12)}px ${30 * (zoomLevel / 12)}px, ${60 * (zoomLevel / 12)}px ${60 * (zoomLevel / 12)}px, ${60 * (zoomLevel / 12)}px ${60 * (zoomLevel / 12)}px`,
            transform: `scale(${zoomLevel / 12})`,
          }}
        />

        {/* Map Water / Forest Simulated Features */}
        <div className="absolute top-1/4 left-10 w-48 h-32 bg-teal-900/30 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute bottom-10 right-20 w-64 h-40 bg-emerald-900/20 rounded-full blur-3xl pointer-events-none" />

        {/* Center Indicator */}
        <div className="absolute top-4 left-4 z-20 bg-slate-900/90 border border-slate-800 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-200 backdrop-blur-md flex items-center gap-2">
          <Compass size={14} className="text-emerald-400 animate-spin" />
          <span>Középpont: {currentCity} ({mapCenter.lat.toFixed(4)}, {mapCenter.lng.toFixed(4)})</span>
          <Badge className="bg-emerald-950 text-emerald-300 border border-emerald-800 text-[10px]">
            Zoom: {zoomLevel}x
          </Badge>
        </div>

        {/* Floating "Search in this area" Button (IV.14 Requirement) */}
        {hasMoved && (
          <div className="absolute top-4 z-30 left-1/2 -translate-x-1/2 animate-in fade-in zoom-in-95">
            <Button
              type="button"
              onClick={handleSearchThisArea}
              disabled={isSearchingArea}
              className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-2xl text-xs px-5 py-5 shadow-2xl shadow-emerald-500/40 border border-emerald-400 flex items-center gap-2"
            >
              <RefreshCw size={15} className={isSearchingArea ? 'animate-spin' : ''} />
              <span>Keresés ezen a területen</span>
            </Button>
          </div>
        )}

        {/* Map Control Buttons (Pan & Zoom) */}
        <div className="absolute right-4 top-4 z-20 flex flex-col gap-2 bg-slate-900/90 p-2 rounded-2xl border border-slate-800 backdrop-blur-md">
          <button
            type="button"
            onClick={handleZoomIn}
            className="p-2 text-slate-300 hover:text-emerald-400 hover:bg-slate-800 rounded-xl transition"
            title="Nagyítás (+)"
          >
            <ZoomIn size={18} />
          </button>
          <button
            type="button"
            onClick={handleZoomOut}
            className="p-2 text-slate-300 hover:text-emerald-400 hover:bg-slate-800 rounded-xl transition"
            title="Kicsinyítés (-)"
          >
            <ZoomOut size={18} />
          </button>

          <hr className="border-slate-800 my-0.5" />

          {/* Pan Navigation Buttons */}
          <div className="grid grid-cols-3 gap-1 w-20">
            <div />
            <button
              type="button"
              onClick={() => handlePanMap('up')}
              className="p-1.5 text-center text-slate-300 hover:text-emerald-400 bg-slate-800/80 rounded-lg text-xs font-bold"
            >
              ▲
            </button>
            <div />
            <button
              type="button"
              onClick={() => handlePanMap('left')}
              className="p-1.5 text-center text-slate-300 hover:text-emerald-400 bg-slate-800/80 rounded-lg text-xs font-bold"
            >
              ◄
            </button>
            <div className="p-1 flex items-center justify-center">
              <Move size={12} className="text-slate-500" />
            </div>
            <button
              type="button"
              onClick={() => handlePanMap('right')}
              className="p-1.5 text-center text-slate-300 hover:text-emerald-400 bg-slate-800/80 rounded-lg text-xs font-bold"
            >
              ►
            </button>
            <div />
            <button
              type="button"
              onClick={() => handlePanMap('down')}
              className="p-1.5 text-center text-slate-300 hover:text-emerald-400 bg-slate-800/80 rounded-lg text-xs font-bold"
            >
              ▼
            </button>
            <div />
          </div>
        </div>

        {/* Interactive Property PIN Markers */}
        <div className="relative w-full h-full p-12 flex flex-wrap items-center justify-around z-10">
          {properties.map((prop, index) => {
            const isSelected = selectedProperty?.id === prop.id;
            // Spread pins inside container simulating coordinates
            const offsetX = ((index * 37) % 70) - 35;
            const offsetY = ((index * 29) % 60) - 30;

            return (
              <div
                key={prop.id}
                style={{ transform: `translate(${offsetX}px, ${offsetY}px)` }}
                className="relative group cursor-pointer transition-all duration-300 hover:z-30"
              >
                <button
                  type="button"
                  onClick={() => {
                    setSelectedProperty(prop);
                    onSelectProperty?.(prop);
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full font-black text-xs shadow-xl transition-all border transform hover:scale-110 ${
                    isSelected
                      ? 'bg-emerald-400 text-slate-950 border-white ring-4 ring-emerald-500/50 scale-110'
                      : 'bg-slate-900 border-emerald-500/60 text-emerald-300 hover:bg-emerald-950 hover:border-emerald-400'
                  }`}
                >
                  <MapPin size={14} className={isSelected ? 'text-slate-950 fill-slate-950' : 'text-emerald-400'} />
                  <span>{prop.price.replace(' Ft', '')}</span>
                </button>
              </div>
            );
          })}
        </div>

        {/* Selected Property Preview Popup Modal Card */}
        {selectedProperty && (
          <div className="absolute bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-96 z-40 bg-slate-900 border border-slate-800 text-slate-100 rounded-2xl p-4 shadow-2xl backdrop-blur-xl animate-in slide-in-from-bottom-3">
            <button
              type="button"
              onClick={() => setSelectedProperty(null)}
              className="absolute top-3 right-3 text-slate-400 hover:text-slate-100 p-1 rounded-lg bg-slate-800 hover:bg-slate-700"
            >
              <X size={14} />
            </button>

            <div className="flex gap-3">
              <img
                src={selectedProperty.image}
                alt={selectedProperty.title}
                className="w-24 h-24 rounded-xl object-cover border border-slate-800 shrink-0"
              />
              <div className="space-y-1 pr-6 min-w-0">
                <Badge className="bg-emerald-950 text-emerald-400 border border-emerald-800 text-[10px] font-bold">
                  {selectedProperty.typeLabel} · {selectedProperty.location}
                </Badge>
                <h4 className="font-extrabold text-sm text-slate-100 line-clamp-1">{selectedProperty.title}</h4>
                <div className="font-black text-emerald-400 text-base">{selectedProperty.price}</div>
                <div className="text-[11px] text-slate-400 font-medium">
                  {selectedProperty.area} m² · {selectedProperty.rooms} szoba
                </div>
              </div>
            </div>

            <div className="mt-3 pt-2 border-t border-slate-800 flex justify-end">
              <Button asChild size="sm" className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs">
                <Link href={`/product/${selectedProperty.id}`} className="flex items-center gap-1">
                  <span>Részletek megtekintése</span>
                  <ExternalLink size={12} />
                </Link>
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
