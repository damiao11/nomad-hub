'use client';

type SearchResult = {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
};

type MapSearchBarProps = {
  searchQuery: string;
  searchResults: SearchResult[];
  onSearchQueryChange: (value: string) => void;
  onSearch: () => void;
  onSelectResult: (result: SearchResult) => void;
};

export default function MapSearchBar({
  searchQuery,
  searchResults,
  onSearchQueryChange,
  onSearch,
  onSelectResult,
}: MapSearchBarProps) {
  return (
    <div className="absolute top-5 left-5 z-[1000] w-[360px] max-w-[calc(100%-2.5rem)]">
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
            if (e.key === 'Enter') {
              e.preventDefault();
              onSearch();
            }
          }}
          placeholder="搜索地点..."
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
        <div className="mt-2 max-h-64 overflow-auto rounded-lg bg-white py-1 shadow-lg ring-1 ring-black/10">
          {searchResults.map((result) => (
            <button
              key={result.place_id}
              onClick={() => onSelectResult(result)}
              className="block w-full px-3 py-2 text-left text-sm text-gray-700 transition-colors hover:bg-gray-100"
            >
              {result.display_name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
