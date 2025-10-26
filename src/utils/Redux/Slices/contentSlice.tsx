import { createSlice } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";
export interface contentType {
  contentData: any[];
  loading: Boolean;
  refreshContent: Boolean;
}

const initialState: contentType = {
  contentData: [],
  loading: false,
  refreshContent: false,
};

const contentSlice = createSlice({
  name: "content",
  initialState,
  reducers: {
    setContentData(state, action: PayloadAction<any[]>) {
      state.contentData = action.payload;
    },
    setLoading(state, action: PayloadAction<Boolean>) {
      state.loading = action.payload;
    },
    setRefreshContent(state) {
      state.refreshContent = !state.refreshContent;
    },
  },
});
export const { setContentData, setLoading, setRefreshContent } =
  contentSlice.actions;
export default contentSlice.reducer;
