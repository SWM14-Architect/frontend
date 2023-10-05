import React, {useCallback, useRef, useState} from "react";
import style from "../../styles/interviewChat.module.css";
import {useRecoilState} from "recoil";
import {
  interviewDataAtom,
  interviewIdAtom,
  interviewResultAtom,
  interviewStateAtom,
  roomIdAtom
} from "../../store/interviewRoomAtom";
import AIProfileImage from "../../assets/free-icon-man-4086624-p-500.png";
import HumanProfileImage from "../../assets/free-icon-man-3884851-p-500.png";
import TypeIt from "typeit-react";
import {useInterval} from "../../utils/useInterval";
import {ScrollToTop} from "../../utils/scrollRestoration";
import {chatHistoryAtom} from "../../store/interviewChatAtom";
import {answer_api, evaluation_api} from "../../api/interview";
import interviewSummaryGenerator from "../../utils/interviewSummaryGenerator";
import {loadingAtom, loadingMessageAtom} from "../../store/loadingAtom";

function TextareaForm({placeholder, item, onChange}){
  const textRef = useRef(null);

  // Textarea height auto resize
  const handleResizeHeight = useCallback(() => {
    textRef.current.style.height = "auto";
    textRef.current.style.height = textRef.current.scrollHeight + "px";
  }, []);

  return (
    <textarea
      ref={textRef}
      className={`${style.input_form_textbox}`}
      placeholder={placeholder}
      onInput={handleResizeHeight}
      onChange={e => onChange(e)}
      value={item}
    />
  );
}

function InterviewChat(){
  ScrollToTop();
  const intervieweeAnswerRef = useRef(null);
  const [, setIsLoading] = useRecoilState(loadingAtom);
  const [, setLoadingMessage] = useRecoilState(loadingMessageAtom);
  const [, setRoomID] = useRecoilState(roomIdAtom);
  const [interviewData, ] = useRecoilState(interviewDataAtom);
  const [chatHistory, setChatHistory] = useRecoilState(chatHistoryAtom); // 채팅내역
  const [, setInterviewResult] = useRecoilState(interviewResultAtom); // 인터뷰 결과
  const [interviewId, ] = useRecoilState(interviewIdAtom);
  const [interviewState, setInterviewState] = useRecoilState(interviewStateAtom);

  const [isTyping, setIsTyping] = useState(null); // isTyping: Optional[{index: index, type:item.type(AI or Human), instance:TypeIt instance}]
  const [intervieweeAnswerFormText, setIntervieweeAnswerFormText] = useState(""); // Form Value
  const [intervieweeAnswer, setIntervieweeAnswer] = useState(""); // 사용자의 현재 질문에 대한 답변 내용
  const [interviewTurn, setInterviewTurn] = useState(false); // [false: AI 질문 중 true: Interviewee 답변 가능]
  const [interviewFlag, setInterviewFlag] = useState(false); // [false: 인터뷰 진행 중 true: 인터뷰 종료]

  const canNotPlayerTalking = () => {
    if(intervieweeAnswerFormText === "" || interviewTurn === false || isTyping !== null) return true;
    return false;
  }

  const handleIntervieweeAnswerButton = (e, answerContent) => {
    e.preventDefault();
    if(canNotPlayerTalking()) return;

    setChatHistory([...chatHistory, {type:"Human", content: answerContent}]);
    setIntervieweeAnswer(answerContent);
    setIntervieweeAnswerFormText("");
    intervieweeAnswerRef.current.scrollIntoView({behavior: "smooth"});
  }

  const handleInterviewerQuestion = (e, questionContent) => {
    const question = {type:"AI", content: questionContent};
    setChatHistory([...chatHistory, question]);
  }

  const isInterviewEnded = (followupQuestion) => {
    if(interviewState.initialQuestionIndex >= interviewState.initialQuestions.length-1){
      if(followupQuestion.question_id === null || interviewState.askedQuestions.length >= 15){
        return true;
      }
    }
    return false;
  }

  const setQuestionAsDone = (ask_idx) => {
    const interviewStateCopy = JSON.parse(JSON.stringify(interviewState));
    const question = interviewStateCopy.askedQuestions[ask_idx];
    if(question.is_initial){
      // 초기질문 리스트에서 해당하는 질문을 is_done으로 변경합니다.
      const initialQuestionIndex = interviewStateCopy.initialQuestions.findIndex((item) => item._id === question._id);
      interviewStateCopy.initialQuestions[initialQuestionIndex].is_done = true;
    }
    interviewStateCopy.askedQuestions[ask_idx].is_done = true;
    interviewStateCopy.lastId = question._id;
    interviewStateCopy.lastContent = question.content;
    setInterviewState(interviewStateCopy);
  }

  const getNextQuestion = (followupQuestion) => {
    const interviewStateCopy = JSON.parse(JSON.stringify(interviewState));
    if(followupQuestion.question_id === null || interviewState.followupQuestionCount >= 3){
      console.log("Next Initial Question");
      // 다음 초기질문을 가져옵니다.
      interviewStateCopy.initialQuestionIndex += 1;
      interviewStateCopy.followupQuestionCount = 0;
      const nextQuestion = interviewState.initialQuestions[interviewStateCopy.initialQuestionIndex];
      interviewStateCopy.askedQuestions.push(nextQuestion);
      setInterviewState(interviewStateCopy);
      return nextQuestion;
    }
    else{
      console.log("Next Followup Question");
      // 생성된 꼬리질문을 가져옵니다.
      interviewStateCopy.followupQuestionCount += 1;
      const nextQuestion = {
        _id: followupQuestion.question_id,
        content: followupQuestion.question_content,
        feedback: 0,
        is_initial: false,
        is_done: false
      }
      interviewStateCopy.askedQuestions.push(nextQuestion);
      setInterviewState(interviewStateCopy);
      return nextQuestion;
    }
  }

  const handleInterviewEnd = () => {
    setIsLoading(true);
    setLoadingMessage("면접 결과를 분석하고 있습니다. 평균 소요 시간은 8 ~ 12초입니다.");
    evaluation_api({interview_id: interviewId}).then((res) => {
      console.log(res.message.evaluations);

      setIsLoading(false);
      setInterviewResult(interviewSummaryGenerator(res.message.evaluations)); // 결과내용을 interviewResultAtom에 저장합니다.
      setRoomID("interviewFeedback");
    }).catch((err) => {
      setIsLoading(false);
      console.log(err);
    });
  }

  // 1초마다 입력이 완료되었는지 체크합니다.
  useInterval(() => {
    if(isTyping !== null && isTyping.instance.is("completed")){
      if(isTyping.type === "AI"){
        // AI의 질문이 완료되었을 때, 인터뷰어가 답변을 입력할 수 있도록 합니다.
        setInterviewTurn(true);
      }
      else{
        const currentIndex = interviewState.askedQuestions.length-1;
        const currentQuestion = interviewState.askedQuestions[currentIndex];
        // 유저의 답변이 완료되었을 때,
        answer_api({
          interview_id: interviewId,
          question_id: currentQuestion._id,
          question_content: currentQuestion.content,
          answer_content: intervieweeAnswer
        }).then((res) => {
          console.log("answer Api Success");
          // 질문에 대한 답변을 성공적으로 보냈기 때문에 질문 상태를 갱신합니다.
          setQuestionAsDone(currentIndex);

          if(isInterviewEnded(res.message)){
            // INTERVIEW_END, 결과 페이지로 이동할 수 있는 버튼이 활성화합니다.
            setInterviewFlag(true);
            handleInterviewerQuestion(null, "수고하셨습니다!");
          }
          else{
            // NEXT_QUESTION, 다음 질문을 출력합니다.
            const nextQuestion = getNextQuestion(res.message);
            handleInterviewerQuestion(null, nextQuestion.content);
          }
        })
        .catch((err) => {
          handleInterviewerQuestion(null, "다시 한번 더 말씀해주실 수 있나요?");
          setIntervieweeAnswerFormText(intervieweeAnswer);
          console.log(err);
        });
      }
      setIsTyping(null);
      return;
    }
  }, 1000, isTyping);

  return (
    <section style={{backgroundColor:"#f4f7fb", flex:1}}>
      <div className={`container`} style={{flexDirection:"column"}}>
        {/* 타이틀 컴포넌트 */}
        <div className={`fadeInUpEffect`}>
          <div className={`${style.header}`}>{interviewData.interviewTargetCompany} 가상면접</div>
          <div className={`${style.sub_header}`}>{interviewData.interviewTargetPosition}</div>
          <ThirdStep/>
        </div>
        {/* 인터뷰 채팅 히스토리 컴포넌트 */}
        {chatHistory.map((item, index) => (
          <div key={index} className={`${style.chat_box} fadeInUpEffect`}>
            <div className={`${style.profile_box} ${item.type === "AI" ? null : style.profile_back}`}>
              <img src={item.type === "AI" ? AIProfileImage : HumanProfileImage} className={`${style.profile_image}`} alt={"profile"}/>
              <span>{item.type === "AI" ? "AI면접관" : "나"}</span>
            </div>
            {/* 마지막 대화 컴포넌트만 TypeIt으로 렌더링해서
                새로고침했을 때 모든 대화에 TypeIt 효과가 적용되는 현상을 방지함. */}
            { chatHistory.length-1 === index ?
              <TypeIt
                className={`${style.chat_message}`}
                options={{speed: 40}}
                getBeforeInit={(instance) => {
                  // 마지막 대화에 대해서만 typing을 체크합니다.
                  if(index === chatHistory.length-1) {
                    setIsTyping({index: index, type:item.type, instance:instance});
                  }
                  setInterviewTurn(false);
                  return instance;
                }}
              >
                {item.content}
              </TypeIt> :
              <span className={`${style.chat_message}`}>
                {item.content}
              </span>
            }
          </div>
        ))}
        {/* 답변 작성 컴포넌트 */}
        {interviewFlag === false ?
          <div ref={intervieweeAnswerRef} className={`${style.input_form} fadeInUpEffect animation-delay-1`}>
            <TextareaForm
              placeholder={"질문에 대한 답변을 작성하세요."}
              item={intervieweeAnswerFormText}
              onChange={(e) => {setIntervieweeAnswerFormText(e.target.value)}}
            />
            <button
              className={`${style.input_form_button} ${canNotPlayerTalking() ? style.input_form_disabled : null}`}
              onClick={(e) => handleIntervieweeAnswerButton(e, intervieweeAnswerFormText)}
            >
              답변 제출하기
            </button>
          </div> :
          <div className={`${style.input_form}`}>
            <button
              className={`${style.input_form_button} ${style.result_form_button}`}
              onClick={() => handleInterviewEnd()}
            >
              결과 확인하기
            </button>
          </div>
        }
      </div>
    </section>
  );
}

function ThirdStep() {
  return (
    <div>
      <ol class="flex items-center w-full text-sm font-medium text-center text-gray-500 dark:text-gray-400 sm:text-base m-3">
        <li class="flex md:w-full items-center after:content-[''] after:w-full after:h-1 after:border-b after:border-gray-200 after:border-1 after:hidden sm:after:inline-block after:mx-6 xl:after:mx-10 dark:after:border-gray-700">
          <span class="flex items-center after:content-['/'] sm:after:hidden after:mx-2 after:text-gray-200 dark:after:text-gray-500">
            <span class="mr-2">1</span>
            Select <span class="hidden sm:inline-flex sm:ml-2">Mode</span>
          </span>
        </li>
        <li class="flex md:w-full items-center after:content-[''] after:w-full after:h-1 after:border-b after:border-gray-200 after:border-1 after:hidden sm:after:inline-block after:mx-6 xl:after:mx-10 dark:after:border-gray-700">
          <span class="flex items-center after:content-['/'] sm:after:hidden after:mx-2 after:text-gray-200 dark:after:text-gray-500">
            <span class="mr-2">2</span>
            <span class="hidden sm:inline-flex sm:ml-2">Input</span>
          </span>
        </li>
        <li class="flex md:w-full items-center text-blue-600 dark:text-blue-500 sm:after:content-[''] after:w-full after:h-1 after:border-b after:border-gray-200 after:border-1 after:hidden sm:after:inline-block after:mx-6 xl:after:mx-10 dark:after:border-gray-700">
          <span class="flex items-center after:content-['/'] sm:after:hidden after:mx-2 after:text-gray-200 dark:after:text-gray-500">
            <svg
              class="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-2.5"
              aria-hidden="true"
              xmlns="http://www.w3.org/2000/svg"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path d="M10 .5a9.5 9.5 0 1 0 9.5 9.5A9.51 9.51 0 0 0 10 .5Zm3.707 8.207-4 4a1 1 0 0 1-1.414 0l-2-2a1 1 0 0 1 1.414-1.414L9 10.586l3.293-3.293a1 1 0 0 1 1.414 1.414Z" />
            </svg>
            <span class="hidden sm:inline-flex sm:ml-2">Interview</span>
          </span>
        </li>
        <li class="flex items-center">
          <span class="mr-2">4</span>
          Result
        </li>
      </ol>
    </div>
  );
}

export default InterviewChat;