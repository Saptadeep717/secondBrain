import { createSlice } from "@reduxjs/toolkit";
import type {PayloadAction} from "@reduxjs/toolkit"
// This describes *this slice's* state, not the entire store
export interface AuthState {
  signupData: Record<string, any> | null; // Or define a proper type for signup data
  loading: boolean;
  token: string | null;
}

const initialState: AuthState = {
  signupData: null,
  loading: false,
  token: localStorage.getItem("token") || null,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setSignupData(state, action: PayloadAction<Record<string, any> | null>) {
      state.signupData = action.payload;
    },
    setLoading(state, action: PayloadAction<boolean>) {
      state.loading = action.payload;
    },
    setToken(state, action: PayloadAction<string | null>) {
      state.token = action.payload;

      // Persist token in localStorage for session persistence
      if (action.payload) {
        localStorage.setItem("token", action.payload);
      } else {
        localStorage.removeItem("token");
      }
    },
  },
});


export const { setSignupData, setLoading, setToken } = authSlice.actions;
export default authSlice.reducer;
