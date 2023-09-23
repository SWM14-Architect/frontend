import {Outlet} from "react-router-dom";
import Header from "./components/header";
import Footer from "./components/footer";
import Loading from "./components/loading";
import React from "react";
import {useRecoilState} from "recoil";
import {loadingAtom, loadingMessageAtom} from "./store/loadingAtom";
import RouteChangeTracker from "./RouteChangeTracker";
import JWT from "./JWT";

function App(){
  // 모든 화면에 공통된 부분을 처리하는 컴포넌트
  // <Outlet/>은 라우터가 연결된 컴포넌트를 표시하는 영역
  JWT();
  RouteChangeTracker();
  const [isLoading, ] = useRecoilState(loadingAtom);
  const [loadingMessage, ] = useRecoilState(loadingMessageAtom);
  return(
    <div className={`wrapper`}>
      <div className={`contentWrapper`}>
        <Header/>
        <Outlet/>
      </div>
      <Footer/>
      {isLoading ? <Loading message={loadingMessage} isLoading={isLoading} /> : null}
    </div>
  )
}

export default App;