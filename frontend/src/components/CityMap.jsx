import { CircleMarker, MapContainer, Popup, TileLayer, ZoomControl } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'

const CITY_CENTER = [44.839103, 65.505723]
const TILE_URL = import.meta.env.VITE_MAP_TILE_URL || 'https://tile.openstreetmap.org/{z}/{x}/{y}.png'

export default function CityMap({ stores, selected, onSelect, query }) {
  const visibleStores = stores.filter(store => store.name.toLowerCase().includes(query.toLowerCase()) || store.address.toLowerCase().includes(query.toLowerCase()))
  return <div className="map-canvas">
    <MapContainer center={CITY_CENTER} zoom={13} minZoom={11} maxZoom={19} scrollWheelZoom zoomControl={false} className="city-map">
      <TileLayer url={TILE_URL} attribution={'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>'}/>
      <ZoomControl position="bottomright"/>
      {visibleStores.map(store => <CircleMarker
        key={store.id}
        center={store.position}
        radius={selected?.id === store.id ? 11 : 8}
        eventHandlers={{ click: () => onSelect(store) }}
        pathOptions={{ color: '#ffffff', weight: 3, fillColor: store.from2gis ? '#dc8543' : '#28745a', fillOpacity: 1 }}
      >
        <Popup>
          <div className="map-popup">
            <b>{store.name}</b>
            <span>{store.address}</span>
            {store.mapUrl && <a href={store.mapUrl} target="_blank" rel="noreferrer">Открыть точку в 2ГИС ↗</a>}
            <button type="button" onClick={() => onSelect(store)}>Показать магазин</button>
          </div>
        </Popup>
      </CircleMarker>)}
    </MapContainer>
  </div>
}
