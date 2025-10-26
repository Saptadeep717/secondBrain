import { combineReducers, configureStore } from "@reduxjs/toolkit";
import { persistReducer, persistStore } from "redux-persist";
import storage from "redux-persist/lib/storage";
import authReducer from "./Slices/userSlice";
import linKReducer from "./Slices/copylinkSlice"
import contentReducer from "./Slices/contentSlice"
const persistConfig = {
  key: "root",
  storage,
  version: 1,
};

const rootReducer = combineReducers({
  auth: authReducer,
  link_:linKReducer,
  content:contentReducer
});

const persist_Reducer = persistReducer(persistConfig, rootReducer);

export const store = configureStore({
  reducer: persist_Reducer,
  middleware: (getDefaultMiddleware) => {
    return getDefaultMiddleware({
      serializableCheck: false,
    });
  },
});

export type RootState = ReturnType<typeof store.getState>;
export const persistor = persistStore(store);
