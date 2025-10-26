//import { Signin } from "./pages/Signin"; // Importing the Signin page component
//import { Signup } from "./pages/Signup"; // Importing the Signup page component
import { BrowserRouter, Routes, Route } from "react-router-dom"; // Importing Router components from react-router-dom for routing
import DashBoard from "./pages/DashBoard";
import Signup from "./pages/Signup";
import Login from "./pages/Login";
import ProtectedRoute from "./components/Auth/ProtectedRoute";
import Error from "./utils/Error";
import OpenRoute from "./components/Auth/OpenRoute";
import { Toaster } from "react-hot-toast";
import SharedBrain from "./pages/SharedBrain";
// App component to define the routing structure of the application
function App() {
  return (
    <BrowserRouter>
      {/* BrowserRouter is the main wrapper for routing in React */}
      <Routes>
        {/* Defining the routes for each page of the application */}
        <Route path="/*" element={<Error />} />
        <Route element={<OpenRoute />}>
          <Route path="/signup" element={<Signup />} />
          <Route path="/login" element={<Login />} />
        </Route>
        {/* Route for dashboard page */}
        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<DashBoard />} />{" "}
        </Route>
        {/* Shared Brain */}
        <Route path="/content/:hash" element={<SharedBrain />} />
      </Routes>
      <Toaster />
    </BrowserRouter>
  );
}

export default App;
