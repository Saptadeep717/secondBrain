import { createSlice } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";
export interface contentType {
  contentData: any[];
  loading: Boolean;
  refreshContent: Boolean;
  tagFilter: String;
}

const initialState: contentType = {
  contentData: [],
  loading: false,
  refreshContent: false,
  tagFilter: "",
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
    setTagFilter(state, action: PayloadAction<String>) {
      state.tagFilter = action.payload;
    },
  },
});
export const { setContentData, setLoading, setRefreshContent,setTagFilter } =
  contentSlice.actions;
export default contentSlice.reducer;
