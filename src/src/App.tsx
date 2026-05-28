import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Home from './pages/Home';
import RecipeDetail from './pages/RecipeDetail';
import NewRecipe from './pages/NewRecipe';
import EditRecipe from './pages/EditRecipe';
import MyRecipes from './pages/MyRecipes';
import Liked from './pages/Liked';
import Login from './pages/Login';
import Reset from './pages/Reset';
import RequireAuth from './components/RequireAuth';

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="recipes/:id" element={<RecipeDetail />} />
        <Route path="login" element={<Login />} />
        <Route
          path="new"
          element={
            <RequireAuth>
              <NewRecipe />
            </RequireAuth>
          }
        />
        <Route
          path="recipes/:id/edit"
          element={
            <RequireAuth>
              <EditRecipe />
            </RequireAuth>
          }
        />
        <Route
          path="my"
          element={
            <RequireAuth>
              <MyRecipes />
            </RequireAuth>
          }
        />
        <Route
          path="liked"
          element={
            <RequireAuth>
              <Liked />
            </RequireAuth>
          }
        />
        <Route
          path="reset"
          element={
            <RequireAuth>
              <Reset />
            </RequireAuth>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
