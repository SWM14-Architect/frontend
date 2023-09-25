import React from "react";
import ReactDOM from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import ReactGA from "react-ga4";
import "react-toastify/dist/ReactToastify.css";
import { RecoilRoot } from "recoil";
import App from "./App";
import ErrorPage from "./pages/error_page";
import Main from "./pages/main";
import InterviewRoom from "./pages/interviewRoom";
import ToastContainerComponent from "./utils/toastContainer";
import "./styles/font.css";
import "./styles/animation.css";
import "./styles/index.css";
import "./styles/layout.css";
import "./styles/button.hover.css";
import "./styles/radio.input.css";
import "./styles/range.input.css";
import "./styles/loading.css";
import "./styles/toast.css";


// 구글 애널리틱스 운영서버만 적용
if (process.env.REACT_APP_GOOGLE_ANALYTICS) {
  ReactGA.initialize(process.env.REACT_APP_GOOGLE_ANALYTICS);
}

function Index(){
  const router = createBrowserRouter([
    {
      path: "/", element: <App />,
      children: [
        { path: "/", element: <Main /> },
        { path: "/room", element: <InterviewRoom /> },
      ],
      errorElement: <ErrorPage />,
    },
    {
      path: "/error", element: <ErrorPage />,
    }
  ]);

  return(
    <RecoilRoot>
      <ToastContainerComponent/>
      <RouterProvider router={router}/>
    </RecoilRoot>
  )
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <Index/>
);
