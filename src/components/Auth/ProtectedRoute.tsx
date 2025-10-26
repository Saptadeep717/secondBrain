
import { useSelector } from 'react-redux'
import { Navigate, Outlet } from 'react-router-dom'
    import type { RootState } from '../../utils/Redux/Store'
const protectedRoute = () => {

  const {token} = useSelector((state:RootState)=>state.auth)
  return  token? <Outlet/> : <Navigate to="/login"/>
}

export default protectedRoute