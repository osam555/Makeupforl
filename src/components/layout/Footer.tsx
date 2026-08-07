import Link from 'next/link'

/** 원본 #footer 구조/치수 그대로 (contain max-width 1720, padding 52/55) */
export default function Footer() {
  return (
    <div className="mfl-footer">
      <h2 className="blind">하단영역</h2>
      <div className="mfl-contain">
        <div className="foot-info">
          <div className="tit">메이크업포엘</div>
          <address>
            <p>대표자 : 김성희</p>
            <p>주소 : 서울 강남구 논현로157길 12 평화빌딩 201호</p>
            <p>사업자등록번호 : 143-08-02484</p>
            <p>통신판매업 신고번호 : 2017-서울마포-0578</p>
            <p>전화번호 : 02-323-3321</p>
            <p>이메일 : makeupforl@naver.com</p>
          </address>
          <p className="copy">
            <span>COPYRIGHT 2022 MAKEUPFORL. ALL RIGHTS RESERVED.</span>
          </p>
        </div>

        <div className="foot-contact area">
          <div className="tit">Contact Us</div>
          <p className="num">
            <a href="tel:02-323-3321">02-323-3321</a>
          </p>
          <p className="tt">평&nbsp;일 09:00 ~ 22:00 / 토요일 09:00 ~ 18:00 / 일요일 10:00~17:00</p>
        </div>

        <div className="foot-menu area">
          <div className="tit">Privacy</div>
          <ul>
            <li>
              <Link href="/privacy">개인정보처리방침</Link>
            </li>
            <li>
              <Link href="/privacy#email">이메일무단수집거부</Link>
            </li>
          </ul>
        </div>
      </div>
    </div>
  )
}
