'use client';

type PlaceResult = {
  type: 'place';
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
};

type TripResult = {
  type: 'trip';
  id: number;
  name: string;
  note: string;
  lat: number;
  lng: number;
};

type UnifiedResult = PlaceResult | TripResult;

type MapSearchBarProps = {
  searchQuery: string;
  searchResults: UnifiedResult[];
  onSearchQueryChange: (value: string) => void;
  onSearch: () => void;
  onSelectPlace: (result: PlaceResult) => void;
  onSelectTrip: (result: TripResult) => void;
};

export default function MapSearchBar({
  searchQuery, searchResults, onSearchQueryChange, onSearch, onSelectPlace, onSelectTrip,
}: MapSearchBarProps) {
  return (
    <div className="absolute left-3 right-14 top-3 z-[1000] mobile-safe-top [--safe-top-base:0.75rem] md:left-5 md:right-auto md:top-5 md:w-[400px] md:max-w-[calc(100%-2.5rem)]">
      <div className="flex items-center overflow-hidden rounded-lg bg-white shadow-lg ring-1 ring-black/10">
        <div className="pl-3 text-gray-500">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </svg>
        </div>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchQueryChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') { e.preventDefault(); onSearch(); }
          }}
          placeholder="搜索地点或足迹..."
          className="flex-1 px-3 py-3 text-sm text-gray-700 outline-none"
        />
        <button
          onClick={onSearch}
          className="mx-2 rounded-md bg-[#7E9D82] px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-[#6F8B73]"
        >
          搜索
        </button>
      </div>

      {searchResults.length > 0 && (
        <div className="mt-2 max-h-72 overflow-auto rounded-lg bg-white py-1 shadow-lg ring-1 ring-black/10">
          {searchResults.map((result) => (
            <button
              key={result.type === 'trip' ? `trip-${result.id}` : `place-${result.place_id}`}
              onClick={() => result.type === 'trip' ? onSelectTrip(result) : onSelectPlace(result)}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-gray-100"
            >
              <span className="shrink-0 text-xs">
                {result.type === 'trip' ? '📍' : '🔍'}
              </span>
              <div className="min-w-0 flex-1">
                <div className="truncate font-medium text-gray-700">
                  {result.type === 'trip' ? result.name : result.display_name}
                </div>
                <div className="truncate text-[11px] text-gray-400">
                  {result.type === 'trip' ? (result.note || '无备注') : '地点'}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
