import { createSlice } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";
// This describes *this slice's* state, not the entire store
export interface CopyLinkState {
  link: string; // Or define a proper type for signup data
  share: boolean;
  loading: boolean;
}

const initialState: CopyLinkState = {
  link: "",
  share: true,
  loading: false,
};

const linkSlice = createSlice({
  name: "link_",
  initialState,
  reducers: {
    setLinkData(state, action: PayloadAction<string>) {
      state.link = action.payload;
    },
    setLoading(state, action: PayloadAction<boolean>) {
      state.loading = action.payload;
    },
    setInvertShare(state) {
      state.share = !state.share;

      // Persist token in localStorage for session persistence
    },
  },
});

export const { setLinkData, setLoading, setInvertShare } = linkSlice.actions;
export default linkSlice.reducer;
