import { Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout.jsx';
import { ProtectedRoute } from './components/ProtectedRoute.jsx';
import { Home } from './pages/Home.jsx';
import { Search } from './pages/Search.jsx';
import { ItemDetail } from './pages/ItemDetail.jsx';
import { PostItem } from './pages/PostItem.jsx';
import { Dashboard } from './pages/Dashboard.jsx';
import { Chat } from './pages/Chat.jsx';
import { Login } from './pages/Login.jsx';
import { MapView } from './pages/MapView.jsx';
import { NotFound } from './pages/NotFound.jsx';

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
        <Route path="/search" element={<Search />} />
        <Route path="/map" element={<MapView />} />
        <Route path="/items/:id" element={<ItemDetail />} />
        <Route path="/post" element={<PostItem />} />
        <Route path="/login" element={<Login />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/items/:id/chat"
          element={
            <ProtectedRoute>
              <Chat />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
