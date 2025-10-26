// This will prevent authenticated users from accessing this route
import { useSelector } from "react-redux"
import { Navigate, Outlet } from "react-router-dom"
import type { RootState } from '../../utils/Redux/Store'
function OpenRoute() {
  const { token } = useSelector((state:RootState) => state.auth)

  if (token === null) {
    return <Outlet/>
  } else {
    return <Navigate to="/dashboard" />
  }
}

export default OpenRoute