import React, { useCallback, useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";

const sectionStyle = {
  background: "#ffffff",
  borderRadius: "16px",
  padding: "20px",
  boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
  marginBottom: "20px",
};

const inputStyle = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: "10px",
  border: "1px solid #d0d7de",
  boxSizing: "border-box",
  background: "#fff",
};

const textareaStyle = {
  ...inputStyle,
  minHeight: "96px",
  resize: "vertical",
};

const buttonStyle = {
  padding: "10px 14px",
  borderRadius: "10px",
  border: "1px solid #c7d2fe",
  background: "#eef2ff",
  cursor: "pointer",
  fontWeight: 700,
};

const buttonSecondaryStyle = {
  padding: "10px 14px",
  borderRadius: "10px",
  border: "1px solid #d1d5db",
  background: "#ffffff",
  cursor: "pointer",
  fontWeight: 700,
};

const dangerButtonStyle = {
  ...buttonSecondaryStyle,
  border: "1px solid #fecaca",
  background: "#fff1f2",
};

const smallButtonStyle = {
  ...buttonSecondaryStyle,
  padding: "7px 10px",
  fontSize: "13px",
};

const tabs = [
  { key: "notice", label: "공지사항" },
  { key: "tree", label: "수목활력" },
  { key: "soil", label: "토양측정" },
  { key: "community", label: "현장소통" },
];

const emptyTreeForm = {
  id: "",
  number: "",
  measure1: "",
  measure2: "",
  measure3: "",
  measure4: "",
  remark: "",
  latitude: "",
  longitude: "",
  gpsAccuracy: "",
  gpsTimestamp: "",
};

const emptySoilForm = {
  id: "",
  number: "",
  place: "",
  moisture: "",
  ec: "",
  temperature: "",
  remark: "",
  latitude: "",
  longitude: "",
  gpsAccuracy: "",
  gpsTimestamp: "",
};

const emptyNoticeForm = {
  id: "",
  title: "",
  content: "",
  password: "",
};

const emptyCommunityForm = {
  id: "",
  name: "",
  place: "",
  content: "",
  password: "",
};

function getKoreaTimestamp() {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date());
}

function downloadCSV(filename, rows) {
  if (!rows.length) {
    alert("저장할 데이터가 없습니다.");
    return;
  }

  const headers = Object.keys(rows[0]);
  const escapeCell = (value) => {
    const stringValue = value == null ? "" : String(value);
    if (/[",\n]/.test(stringValue)) {
      return `"${stringValue.replace(/"/g, '""')}"`;
    }
    return stringValue;
  };

  const csv = [
    headers.join(","),
    ...rows.map((row) => headers.map((header) => escapeCell(row[header])).join(",")),
  ].join("\n");

  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const href = URL.createObjectURL(blob);
  link.href = href;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(href);
}

function downloadExcel(filename, rows, sheetName) {
  if (!rows.length) {
    alert("저장할 데이터가 없습니다.");
    return;
  }

  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  XLSX.writeFile(workbook, filename);
}

function calculateAverage(row) {
  const nums = [row.measure1, row.measure2, row.measure3, row.measure4]
    .map((v) => Number(v))
    .filter((v) => !Number.isNaN(v));
  return nums.length ? (nums.reduce((sum, cur) => sum + cur, 0) / nums.length).toFixed(2) : "";
}

function gpsLabel(row) {
  if (!row.latitude || !row.longitude) return "";
  return `${row.latitude}, ${row.longitude}`;
}

function makeTreeExportRows(rows) {
  return rows.map((row, index) => ({
    순번: index + 1,
    번호: row.number || "",
    "1번측정": row.measure1 || "",
    "2번측정": row.measure2 || "",
    "3번측정": row.measure3 || "",
    "4번측정": row.measure4 || "",
    평균: row.average || calculateAverage(row),
    비고: row.remark || "",
    위도: row.latitude || "",
    경도: row.longitude || "",
    "GPS정확도_m": row.gpsAccuracy || "",
    "GPS기록시각": row.gpsTimestamp || "",
    등록일시: row.createdAt || "",
    수정일시: row.updatedAt || "",
  }));
}

function makeSoilExportRows(rows) {
  return rows.map((row, index) => ({
    순번: index + 1,
    번호: row.number || "",
    장소: row.place || "",
    토양수분: row.moisture || "",
    EC: row.ec || "",
    토양온도: row.temperature || "",
    비고: row.remark || "",
    위도: row.latitude || "",
    경도: row.longitude || "",
    "GPS정확도_m": row.gpsAccuracy || "",
    "GPS기록시각": row.gpsTimestamp || "",
    등록일시: row.createdAt || "",
    수정일시: row.updatedAt || "",
  }));
}

function Field({ label, children }) {
  return (
    <div>
      <label style={{ display: "block", marginBottom: "6px", fontWeight: 700 }}>{label}</label>
      {children}
    </div>
  );
}

function StatusBox({ children }) {
  return (
    <div style={{ color: "#4b5563", background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: "10px", padding: "10px 12px", marginBottom: "12px", lineHeight: 1.6 }}>
      {children}
    </div>
  );
}

export default function App() {
  const [tab, setTab] = useState("notice");
  const [visitStats, setVisitStats] = useState({ today: "불러오는 중", total: "불러오는 중" });

  const [treeForm, setTreeForm] = useState(emptyTreeForm);
  const [soilForm, setSoilForm] = useState(emptySoilForm);
  const [treeEditId, setTreeEditId] = useState(null);
  const [soilEditId, setSoilEditId] = useState(null);
  const [treeData, setTreeData] = useState([]);
  const [soilData, setSoilData] = useState([]);
  const [surveyStatus, setSurveyStatus] = useState("조사 데이터를 불러오는 중입니다.");

  const [notices, setNotices] = useState([]);
  const [noticeForm, setNoticeForm] = useState(emptyNoticeForm);
  const [noticeEditId, setNoticeEditId] = useState(null);
  const [noticeStatus, setNoticeStatus] = useState("공지사항을 불러오는 중입니다.");

  const [communityPosts, setCommunityPosts] = useState([]);
  const [communityForm, setCommunityForm] = useState(emptyCommunityForm);
  const [communityEditId, setCommunityEditId] = useState(null);
  const [communityStatus, setCommunityStatus] = useState("저장된 의견을 불러오는 중입니다.");

  const treeRows = useMemo(() => treeData.map((item) => ({ ...item, average: calculateAverage(item) })), [treeData]);
  const soilRows = useMemo(() => soilData.map((item) => ({ ...item })), [soilData]);
  const treeExportRows = useMemo(() => makeTreeExportRows(treeRows), [treeRows]);
  const soilExportRows = useMemo(() => makeSoilExportRows(soilRows), [soilRows]);

  const fetchSurveyData = useCallback(async (quiet = false) => {
    try {
      if (!quiet) setSurveyStatus("조사 데이터를 불러오는 중입니다.");
      const response = await fetch("/.netlify/functions/survey-data", { method: "GET" });
      if (!response.ok) throw new Error("조사 데이터 저장소 연결 실패");
      const data = await response.json();
      setTreeData(Array.isArray(data.tree) ? data.tree : []);
      setSoilData(Array.isArray(data.soil) ? data.soil : []);
      setSurveyStatus("조사 데이터가 서버 저장소와 연결되어 있습니다.");
    } catch (error) {
      console.error(error);
      setSurveyStatus("서버 조사 데이터 저장소 연결을 확인해주세요. 배포 로그 또는 함수 설정을 확인해야 할 수 있습니다.");
    }
  }, []);

  const fetchNotices = useCallback(async () => {
    try {
      const response = await fetch("/.netlify/functions/notices", { method: "GET" });
      if (!response.ok) throw new Error("공지사항 저장소 연결 실패");
      const data = await response.json();
      setNotices(Array.isArray(data.notices) ? data.notices : []);
      setNoticeStatus("공지사항을 불러왔습니다.");
    } catch (error) {
      console.error(error);
      setNoticeStatus("공지사항 저장소 연결을 확인해주세요.");
    }
  }, []);

  const fetchCommunityPosts = useCallback(async () => {
    try {
      const response = await fetch("/.netlify/functions/community-posts", { method: "GET" });
      if (!response.ok) throw new Error("현장소통 저장소 연결 실패");
      const data = await response.json();
      setCommunityPosts(Array.isArray(data.posts) ? data.posts : []);
      setCommunityStatus("저장된 의견을 불러왔습니다.");
    } catch (error) {
      console.error(error);
      setCommunityStatus("현장소통 저장소 연결을 확인해주세요.");
    }
  }, []);

  useEffect(() => {
    fetchSurveyData();
    fetchNotices();
    fetchCommunityPosts();

    const intervalId = window.setInterval(() => {
      fetchSurveyData(true);
      fetchNotices();
      fetchCommunityPosts();
    }, 20000);

    return () => window.clearInterval(intervalId);
  }, [fetchSurveyData, fetchNotices, fetchCommunityPosts]);

  useEffect(() => {
    const fetchVisitStats = async () => {
      const todayKey = new Date().toISOString().slice(0, 10);
      const localKey = `visit_counted_${todayKey}`;
      const shouldCount = !localStorage.getItem(localKey);

      try {
        const response = await fetch("/.netlify/functions/visit-stats", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ shouldCount }),
        });
        if (!response.ok) throw new Error("visit stats failed");
        const data = await response.json();
        setVisitStats({ today: data.today, total: data.total });
        if (shouldCount) localStorage.setItem(localKey, "1");
      } catch (error) {
        console.error(error);
        setVisitStats({ today: "확인 필요", total: "확인 필요" });
      }
    };

    fetchVisitStats();
  }, []);

  const getGpsForForm = (setForm) => {
    if (!navigator.geolocation) {
      alert("이 브라우저에서는 GPS 위치 기능을 지원하지 않습니다.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        setForm((prev) => ({
          ...prev,
          latitude: latitude.toFixed(6),
          longitude: longitude.toFixed(6),
          gpsAccuracy: accuracy ? Math.round(accuracy).toString() : "",
          gpsTimestamp: getKoreaTimestamp(),
        }));
      },
      (error) => {
        console.error(error);
        alert("GPS 좌표를 가져오지 못했습니다. 브라우저 위치 권한을 허용했는지 확인해주세요.");
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
    );
  };

  const saveSurveyItem = async (type, item, editId) => {
    const response = await fetch("/.netlify/functions/survey-data", {
      method: editId ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, id: editId, item }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || data.ok === false) throw new Error(data.error || "조사 데이터 저장 실패");
    setTreeData(Array.isArray(data.tree) ? data.tree : []);
    setSoilData(Array.isArray(data.soil) ? data.soil : []);
    setSurveyStatus(editId ? "조사 데이터가 수정되어 서버에 저장되었습니다." : "조사 데이터가 서버에 저장되었습니다.");
  };

  const deleteSurveyItem = async (type, id) => {
    const response = await fetch("/.netlify/functions/survey-data", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, id }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || data.ok === false) throw new Error(data.error || "조사 데이터 삭제 실패");
    setTreeData(Array.isArray(data.tree) ? data.tree : []);
    setSoilData(Array.isArray(data.soil) ? data.soil : []);
    setSurveyStatus("조사 데이터가 삭제되어 서버에 반영되었습니다.");
  };

  const handleTreeSave = async () => {
    if (!treeForm.number) return alert("번호를 입력해주세요.");
    try {
      await saveSurveyItem("tree", treeForm, treeEditId);
      setTreeForm(emptyTreeForm);
      setTreeEditId(null);
    } catch (error) {
      console.error(error);
      alert(error.message || "수목활력 데이터 저장에 실패했습니다.");
    }
  };

  const handleSoilSave = async () => {
    if (!soilForm.number) return alert("번호를 입력해주세요.");
    if (!soilForm.moisture && !soilForm.ec && !soilForm.temperature) return alert("토양 측정값을 입력해주세요.");
    try {
      await saveSurveyItem("soil", soilForm, soilEditId);
      setSoilForm(emptySoilForm);
      setSoilEditId(null);
    } catch (error) {
      console.error(error);
      alert(error.message || "토양측정 데이터 저장에 실패했습니다.");
    }
  };

  const startTreeEdit = (row) => {
    setTreeEditId(row.id);
    setTreeForm({ ...emptyTreeForm, ...row });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const startSoilEdit = (row) => {
    setSoilEditId(row.id);
    setSoilForm({ ...emptySoilForm, ...row });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleNoticeSave = async () => {
    if (!noticeForm.title || !noticeForm.content) return alert("공지 제목과 내용을 입력해주세요.");
    if (!noticeForm.password) return alert("관리 비밀번호를 입력해주세요.");

    try {
      const response = await fetch("/.netlify/functions/notices", {
        method: noticeEditId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...noticeForm, id: noticeEditId }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || data.ok === false) throw new Error(data.error || "공지 저장 실패");
      setNotices(Array.isArray(data.notices) ? data.notices : []);
      setNoticeForm({ ...emptyNoticeForm, password: noticeForm.password });
      setNoticeEditId(null);
      setNoticeStatus(noticeEditId ? "공지사항이 수정되었습니다." : "공지사항이 등록되었습니다.");
    } catch (error) {
      console.error(error);
      alert(error.message || "공지사항 저장에 실패했습니다.");
    }
  };

  const handleNoticeDelete = async (notice) => {
    const password = window.prompt("공지 삭제를 위한 관리 비밀번호를 입력해주세요.");
    if (!password) return;
    if (!window.confirm("이 공지를 삭제하시겠습니까?")) return;

    try {
      const response = await fetch("/.netlify/functions/notices", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: notice.id, password }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || data.ok === false) throw new Error(data.error || "공지 삭제 실패");
      setNotices(Array.isArray(data.notices) ? data.notices : []);
      setNoticeStatus("공지사항이 삭제되었습니다.");
    } catch (error) {
      console.error(error);
      alert(error.message || "공지사항 삭제에 실패했습니다.");
    }
  };

  const startNoticeEdit = (notice) => {
    setNoticeEditId(notice.id);
    setNoticeForm({ id: notice.id, title: notice.title || "", content: notice.content || "", password: noticeForm.password || "" });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleCommunitySave = async () => {
    if (!communityForm.name || !communityForm.content) return alert("작성자와 내용을 입력해주세요.");
    if (!communityForm.password) return alert("수정용 비밀번호를 입력해주세요.");

    try {
      setCommunityStatus(communityEditId ? "의견을 수정하는 중입니다." : "의견을 저장하는 중입니다.");
      const response = await fetch("/.netlify/functions/community-posts", {
        method: communityEditId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...communityForm, id: communityEditId }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || data.ok === false) throw new Error(data.error || "의견 저장 실패");
      setCommunityPosts(Array.isArray(data.posts) ? data.posts : []);
      setCommunityForm(emptyCommunityForm);
      setCommunityEditId(null);
      setCommunityStatus(communityEditId ? "의견이 수정되었습니다." : "의견이 저장되었습니다. 다른 접속자도 이 목록을 볼 수 있습니다.");
    } catch (error) {
      console.error(error);
      setCommunityStatus("현장소통 저장소 연결 또는 비밀번호를 확인해주세요.");
      alert(error.message || "의견 저장에 실패했습니다.");
    }
  };

  const startCommunityEdit = (post) => {
    setCommunityEditId(post.id);
    setCommunityForm({ id: post.id, name: post.name || "", place: post.place || "", content: post.content || "", password: "" });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleCommunityDelete = async (post) => {
    const password = window.prompt("글 작성 시 입력한 비밀번호를 입력해주세요.");
    if (!password) return;
    if (!window.confirm("이 의견을 삭제하시겠습니까?")) return;

    try {
      const response = await fetch("/.netlify/functions/community-posts", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: post.id, password }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || data.ok === false) throw new Error(data.error || "의견 삭제 실패");
      setCommunityPosts(Array.isArray(data.posts) ? data.posts : []);
      setCommunityStatus("의견이 삭제되었습니다.");
    } catch (error) {
      console.error(error);
      alert(error.message || "의견 삭제에 실패했습니다.");
    }
  };

  const SurveyGpsControls = ({ form, setForm }) => (
    <div style={{ marginTop: "12px" }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", alignItems: "center", marginBottom: "10px" }}>
        <button type="button" onClick={() => getGpsForForm(setForm)} style={buttonSecondaryStyle}>현재 GPS 좌표 기록</button>
        <span style={{ color: "#6b7280", fontSize: "14px" }}>
          {form.latitude && form.longitude ? `좌표: ${form.latitude}, ${form.longitude} / 정확도 약 ${form.gpsAccuracy || "?"}m` : "좌표 미기록"}
        </span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "12px" }}>
        <Field label="위도"><input style={inputStyle} value={form.latitude} onChange={(e) => setForm((prev) => ({ ...prev, latitude: e.target.value }))} placeholder="GPS 버튼 사용" /></Field>
        <Field label="경도"><input style={inputStyle} value={form.longitude} onChange={(e) => setForm((prev) => ({ ...prev, longitude: e.target.value }))} placeholder="GPS 버튼 사용" /></Field>
        <Field label="GPS 정확도(m)"><input style={inputStyle} value={form.gpsAccuracy} onChange={(e) => setForm((prev) => ({ ...prev, gpsAccuracy: e.target.value }))} /></Field>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: "#f3f4f6", padding: "24px", color: "#111827" }}>
      <div style={{ maxWidth: "1180px", margin: "0 auto" }}>
        <div style={sectionStyle}>
          <h1 style={{ marginTop: 0, marginBottom: "8px" }}>퍼니어캔의 현장조사 야장 SET</h1>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "12px", marginBottom: "14px" }}>
            <div style={{ background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: "12px", padding: "14px" }}>
              <div style={{ fontSize: "14px", color: "#6b7280", marginBottom: "6px" }}>오늘 방문자수</div>
              <div style={{ fontSize: "24px", fontWeight: 700 }}>{visitStats.today}</div>
            </div>
            <div style={{ background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: "12px", padding: "14px" }}>
              <div style={{ fontSize: "14px", color: "#6b7280", marginBottom: "6px" }}>전체 방문자수</div>
              <div style={{ fontSize: "24px", fontWeight: 700 }}>{visitStats.total}</div>
            </div>
          </div>
          <p style={{ margin: 0, color: "#4b5563", lineHeight: 1.6 }}>
            공지사항, 수목활력, 토양측정, 현장소통 탭으로 구성되어 있습니다. 수목활력과 토양측정 데이터는 서버에 저장되고, 현장소통 탭에서 다른 사용자도 확인하거나 내려받을 수 있습니다.
          </p>
        </div>

        <div style={{ display: "flex", gap: "10px", marginBottom: "20px", flexWrap: "wrap" }}>
          {tabs.map((item) => (
            <button
              key={item.key}
              onClick={() => setTab(item.key)}
              style={{
                ...buttonStyle,
                background: tab === item.key ? "#dbeafe" : "#ffffff",
                border: tab === item.key ? "1px solid #93c5fd" : "1px solid #d1d5db",
              }}
            >
              {item.label}
            </button>
          ))}
        </div>

        {tab === "notice" && (
          <>
            <div style={sectionStyle}>
              <h2 style={{ marginTop: 0 }}>공지사항 입력</h2>
              <StatusBox>{noticeStatus} 관리 비밀번호 기본값은 README를 참고하고, 실제 운영 전 Netlify 환경변수 ADMIN_PASSWORD로 바꾸는 것을 권장합니다.</StatusBox>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "12px", marginBottom: "12px" }}>
                <Field label="공지 제목"><input style={inputStyle} value={noticeForm.title} onChange={(e) => setNoticeForm({ ...noticeForm, title: e.target.value })} placeholder="예: 5월 현장조사 안내" /></Field>
                <Field label="관리 비밀번호"><input style={inputStyle} type="password" value={noticeForm.password} onChange={(e) => setNoticeForm({ ...noticeForm, password: e.target.value })} placeholder="공지 등록/수정용" /></Field>
              </div>
              <div style={{ marginBottom: "12px" }}>
                <Field label="공지 내용"><textarea style={textareaStyle} value={noticeForm.content} onChange={(e) => setNoticeForm({ ...noticeForm, content: e.target.value })} placeholder="공지 내용을 입력하세요." /></Field>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
                <button onClick={handleNoticeSave} style={buttonStyle}>{noticeEditId ? "공지 수정 완료" : "공지 등록"}</button>
                {noticeEditId ? <button onClick={() => { setNoticeEditId(null); setNoticeForm({ ...emptyNoticeForm, password: noticeForm.password }); }} style={buttonSecondaryStyle}>수정 취소</button> : null}
              </div>
            </div>

            <div style={sectionStyle}>
              <h2 style={{ marginTop: 0 }}>공지사항 목록</h2>
              {notices.length === 0 ? (
                <div style={{ color: "#6b7280" }}>등록된 공지가 없습니다.</div>
              ) : notices.map((notice, index) => (
                <div key={notice.id || index} style={{ background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: "12px", padding: "16px", marginBottom: index === notices.length - 1 ? 0 : "12px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: "10px", flexWrap: "wrap", marginBottom: "8px" }}>
                    <div style={{ fontWeight: 800 }}>{notice.title}</div>
                    <div style={{ color: "#6b7280", fontSize: "13px" }}>{notice.updatedAt || notice.createdAt || notice.date}</div>
                  </div>
                  <div style={{ color: "#4b5563", lineHeight: 1.7, whiteSpace: "pre-wrap", marginBottom: "12px" }}>{notice.content}</div>
                  <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                    <button onClick={() => startNoticeEdit(notice)} style={smallButtonStyle}>수정</button>
                    <button onClick={() => handleNoticeDelete(notice)} style={{ ...smallButtonStyle, border: "1px solid #fecaca", background: "#fff1f2" }}>삭제</button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {tab === "tree" && (
          <>
            <div style={sectionStyle}>
              <h2 style={{ marginTop: 0 }}>수목활력 입력</h2>
              <StatusBox>{surveyStatus} {treeEditId ? "현재 선택한 행을 수정 중입니다." : "데이터 추가 시 서버에 바로 저장됩니다."}</StatusBox>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "12px", marginBottom: "12px" }}>
                <Field label="번호"><input style={inputStyle} value={treeForm.number} onChange={(e) => setTreeForm({ ...treeForm, number: e.target.value })} placeholder="예: 1" /></Field>
                <Field label="1번측정"><input style={inputStyle} type="number" step="any" value={treeForm.measure1} onChange={(e) => setTreeForm({ ...treeForm, measure1: e.target.value })} /></Field>
                <Field label="2번측정"><input style={inputStyle} type="number" step="any" value={treeForm.measure2} onChange={(e) => setTreeForm({ ...treeForm, measure2: e.target.value })} /></Field>
                <Field label="3번측정"><input style={inputStyle} type="number" step="any" value={treeForm.measure3} onChange={(e) => setTreeForm({ ...treeForm, measure3: e.target.value })} /></Field>
                <Field label="4번측정"><input style={inputStyle} type="number" step="any" value={treeForm.measure4} onChange={(e) => setTreeForm({ ...treeForm, measure4: e.target.value })} /></Field>
              </div>
              <div style={{ marginBottom: "12px" }}>
                <Field label="비고"><textarea style={textareaStyle} value={treeForm.remark} onChange={(e) => setTreeForm({ ...treeForm, remark: e.target.value })} placeholder="특이사항, 수목 상태, 현장 메모 등을 입력하세요." /></Field>
              </div>
              <SurveyGpsControls form={treeForm} setForm={setTreeForm} />
              <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", marginTop: "14px" }}>
                <button onClick={handleTreeSave} style={buttonStyle}>{treeEditId ? "수정 완료" : "데이터 추가"}</button>
                {treeEditId ? <button onClick={() => { setTreeEditId(null); setTreeForm(emptyTreeForm); }} style={buttonSecondaryStyle}>수정 취소</button> : null}
                <button onClick={() => downloadCSV("수목활력_서버저장_전자야장.csv", treeExportRows)} style={buttonSecondaryStyle}>CSV 저장</button>
                <button onClick={() => downloadExcel("수목활력_서버저장_전자야장.xlsx", treeExportRows, "수목활력")} style={buttonSecondaryStyle}>엑셀 저장</button>
                <button onClick={() => fetchSurveyData()} style={buttonSecondaryStyle}>서버 새로고침</button>
              </div>
            </div>

            <div style={sectionStyle}>
              <h2 style={{ marginTop: 0 }}>수목활력 데이터 목록</h2>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", background: "#fff", minWidth: "1000px" }}>
                  <thead><tr style={{ background: "#e5e7eb" }}>
                    {["번호", "1번", "2번", "3번", "4번", "평균", "비고", "GPS", "등록/수정", "관리"].map((h) => <th key={h} style={{ padding: "10px", border: "1px solid #d1d5db" }}>{h}</th>)}
                  </tr></thead>
                  <tbody>
                    {treeRows.length === 0 ? <tr><td colSpan="10" style={{ padding: "14px", border: "1px solid #d1d5db", textAlign: "center" }}>아직 입력된 데이터가 없습니다.</td></tr> : treeRows.map((row) => (
                      <tr key={row.id}>
                        <td style={{ padding: "10px", border: "1px solid #d1d5db" }}>{row.number}</td>
                        <td style={{ padding: "10px", border: "1px solid #d1d5db" }}>{row.measure1}</td>
                        <td style={{ padding: "10px", border: "1px solid #d1d5db" }}>{row.measure2}</td>
                        <td style={{ padding: "10px", border: "1px solid #d1d5db" }}>{row.measure3}</td>
                        <td style={{ padding: "10px", border: "1px solid #d1d5db" }}>{row.measure4}</td>
                        <td style={{ padding: "10px", border: "1px solid #d1d5db", fontWeight: 800 }}>{row.average}</td>
                        <td style={{ padding: "10px", border: "1px solid #d1d5db", whiteSpace: "pre-wrap" }}>{row.remark}</td>
                        <td style={{ padding: "10px", border: "1px solid #d1d5db" }}>{gpsLabel(row)}</td>
                        <td style={{ padding: "10px", border: "1px solid #d1d5db", fontSize: "13px", color: "#4b5563" }}>{row.updatedAt || row.createdAt}</td>
                        <td style={{ padding: "10px", border: "1px solid #d1d5db" }}>
                          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                            <button onClick={() => startTreeEdit(row)} style={smallButtonStyle}>수정</button>
                            <button onClick={() => { if (window.confirm("이 수목활력 데이터를 삭제하시겠습니까?")) deleteSurveyItem("tree", row.id); }} style={dangerButtonStyle}>삭제</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {tab === "soil" && (
          <>
            <div style={sectionStyle}>
              <h2 style={{ marginTop: 0 }}>토양측정 입력</h2>
              <StatusBox>{surveyStatus} {soilEditId ? "현재 선택한 행을 수정 중입니다." : "데이터 추가 시 서버에 바로 저장됩니다."}</StatusBox>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "12px", marginBottom: "12px" }}>
                <Field label="번호"><input style={inputStyle} value={soilForm.number} onChange={(e) => setSoilForm({ ...soilForm, number: e.target.value })} placeholder="예: 1" /></Field>
                <Field label="장소"><input style={inputStyle} value={soilForm.place} onChange={(e) => setSoilForm({ ...soilForm, place: e.target.value })} placeholder="예: A지점, 화단1" /></Field>
                <Field label="토양수분"><input style={inputStyle} type="number" step="any" value={soilForm.moisture} onChange={(e) => setSoilForm({ ...soilForm, moisture: e.target.value })} /></Field>
                <Field label="EC"><input style={inputStyle} type="number" step="any" value={soilForm.ec} onChange={(e) => setSoilForm({ ...soilForm, ec: e.target.value })} /></Field>
                <Field label="토양온도"><input style={inputStyle} type="number" step="any" value={soilForm.temperature} onChange={(e) => setSoilForm({ ...soilForm, temperature: e.target.value })} /></Field>
              </div>
              <div style={{ marginBottom: "12px" }}>
                <Field label="비고"><textarea style={textareaStyle} value={soilForm.remark} onChange={(e) => setSoilForm({ ...soilForm, remark: e.target.value })} placeholder="토양 상태, 관수 여부, 그늘/양지, 특이사항 등을 입력하세요." /></Field>
              </div>
              <SurveyGpsControls form={soilForm} setForm={setSoilForm} />
              <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", marginTop: "14px" }}>
                <button onClick={handleSoilSave} style={buttonStyle}>{soilEditId ? "수정 완료" : "데이터 추가"}</button>
                {soilEditId ? <button onClick={() => { setSoilEditId(null); setSoilForm(emptySoilForm); }} style={buttonSecondaryStyle}>수정 취소</button> : null}
                <button onClick={() => downloadCSV("토양측정_서버저장_전자야장.csv", soilExportRows)} style={buttonSecondaryStyle}>CSV 저장</button>
                <button onClick={() => downloadExcel("토양측정_서버저장_전자야장.xlsx", soilExportRows, "토양측정")} style={buttonSecondaryStyle}>엑셀 저장</button>
                <button onClick={() => fetchSurveyData()} style={buttonSecondaryStyle}>서버 새로고침</button>
              </div>
            </div>

            <div style={sectionStyle}>
              <h2 style={{ marginTop: 0 }}>토양측정 데이터 목록</h2>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", background: "#fff", minWidth: "1000px" }}>
                  <thead><tr style={{ background: "#e5e7eb" }}>
                    {["번호", "장소", "수분", "EC", "온도", "비고", "GPS", "등록/수정", "관리"].map((h) => <th key={h} style={{ padding: "10px", border: "1px solid #d1d5db" }}>{h}</th>)}
                  </tr></thead>
                  <tbody>
                    {soilRows.length === 0 ? <tr><td colSpan="9" style={{ padding: "14px", border: "1px solid #d1d5db", textAlign: "center" }}>아직 입력된 데이터가 없습니다.</td></tr> : soilRows.map((row) => (
                      <tr key={row.id}>
                        <td style={{ padding: "10px", border: "1px solid #d1d5db" }}>{row.number}</td>
                        <td style={{ padding: "10px", border: "1px solid #d1d5db" }}>{row.place}</td>
                        <td style={{ padding: "10px", border: "1px solid #d1d5db" }}>{row.moisture}</td>
                        <td style={{ padding: "10px", border: "1px solid #d1d5db" }}>{row.ec}</td>
                        <td style={{ padding: "10px", border: "1px solid #d1d5db" }}>{row.temperature}</td>
                        <td style={{ padding: "10px", border: "1px solid #d1d5db", whiteSpace: "pre-wrap" }}>{row.remark}</td>
                        <td style={{ padding: "10px", border: "1px solid #d1d5db" }}>{gpsLabel(row)}</td>
                        <td style={{ padding: "10px", border: "1px solid #d1d5db", fontSize: "13px", color: "#4b5563" }}>{row.updatedAt || row.createdAt}</td>
                        <td style={{ padding: "10px", border: "1px solid #d1d5db" }}>
                          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                            <button onClick={() => startSoilEdit(row)} style={smallButtonStyle}>수정</button>
                            <button onClick={() => { if (window.confirm("이 토양측정 데이터를 삭제하시겠습니까?")) deleteSurveyItem("soil", row.id); }} style={dangerButtonStyle}>삭제</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {tab === "community" && (
          <>
            <div style={sectionStyle}>
              <h2 style={{ marginTop: 0 }}>공유 조사데이터</h2>
              <StatusBox>수목활력과 토양측정 탭에 서버 저장된 데이터가 이곳에 자동 공유됩니다. 다른 접속자도 목록을 보고 파일로 내려받을 수 있습니다.</StatusBox>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "12px", marginBottom: "12px" }}>
                <div style={{ background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: "12px", padding: "16px" }}>
                  <div style={{ color: "#6b7280", marginBottom: "6px" }}>수목활력 저장 건수</div>
                  <div style={{ fontSize: "28px", fontWeight: 800, marginBottom: "12px" }}>{treeRows.length}</div>
                  <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                    <button onClick={() => downloadCSV("공유_수목활력.csv", treeExportRows)} style={smallButtonStyle}>CSV 다운로드</button>
                    <button onClick={() => downloadExcel("공유_수목활력.xlsx", treeExportRows, "수목활력")} style={smallButtonStyle}>엑셀 다운로드</button>
                  </div>
                </div>
                <div style={{ background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: "12px", padding: "16px" }}>
                  <div style={{ color: "#6b7280", marginBottom: "6px" }}>토양측정 저장 건수</div>
                  <div style={{ fontSize: "28px", fontWeight: 800, marginBottom: "12px" }}>{soilRows.length}</div>
                  <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                    <button onClick={() => downloadCSV("공유_토양측정.csv", soilExportRows)} style={smallButtonStyle}>CSV 다운로드</button>
                    <button onClick={() => downloadExcel("공유_토양측정.xlsx", soilExportRows, "토양측정")} style={smallButtonStyle}>엑셀 다운로드</button>
                  </div>
                </div>
              </div>
              <button onClick={() => fetchSurveyData()} style={buttonSecondaryStyle}>공유 데이터 새로고침</button>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "12px", marginTop: "16px" }}>
                <div style={{ overflowX: "auto", background: "#ffffff", border: "1px solid #e5e7eb", borderRadius: "12px", padding: "12px" }}>
                  <div style={{ fontWeight: 800, marginBottom: "10px" }}>최근 수목활력 데이터</div>
                  <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "520px" }}>
                    <thead><tr style={{ background: "#f3f4f6" }}>{["번호", "평균", "비고", "GPS"].map((h) => <th key={h} style={{ padding: "8px", border: "1px solid #e5e7eb" }}>{h}</th>)}</tr></thead>
                    <tbody>
                      {treeRows.length === 0 ? <tr><td colSpan="4" style={{ padding: "10px", border: "1px solid #e5e7eb", textAlign: "center", color: "#6b7280" }}>데이터 없음</td></tr> : treeRows.slice(-10).reverse().map((row) => (
                        <tr key={`share-tree-${row.id}`}>
                          <td style={{ padding: "8px", border: "1px solid #e5e7eb" }}>{row.number}</td>
                          <td style={{ padding: "8px", border: "1px solid #e5e7eb", fontWeight: 800 }}>{row.average}</td>
                          <td style={{ padding: "8px", border: "1px solid #e5e7eb", whiteSpace: "pre-wrap" }}>{row.remark}</td>
                          <td style={{ padding: "8px", border: "1px solid #e5e7eb" }}>{gpsLabel(row)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div style={{ overflowX: "auto", background: "#ffffff", border: "1px solid #e5e7eb", borderRadius: "12px", padding: "12px" }}>
                  <div style={{ fontWeight: 800, marginBottom: "10px" }}>최근 토양측정 데이터</div>
                  <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "560px" }}>
                    <thead><tr style={{ background: "#f3f4f6" }}>{["번호", "장소", "수분", "EC", "온도"].map((h) => <th key={h} style={{ padding: "8px", border: "1px solid #e5e7eb" }}>{h}</th>)}</tr></thead>
                    <tbody>
                      {soilRows.length === 0 ? <tr><td colSpan="5" style={{ padding: "10px", border: "1px solid #e5e7eb", textAlign: "center", color: "#6b7280" }}>데이터 없음</td></tr> : soilRows.slice(-10).reverse().map((row) => (
                        <tr key={`share-soil-${row.id}`}>
                          <td style={{ padding: "8px", border: "1px solid #e5e7eb" }}>{row.number}</td>
                          <td style={{ padding: "8px", border: "1px solid #e5e7eb" }}>{row.place}</td>
                          <td style={{ padding: "8px", border: "1px solid #e5e7eb" }}>{row.moisture}</td>
                          <td style={{ padding: "8px", border: "1px solid #e5e7eb" }}>{row.ec}</td>
                          <td style={{ padding: "8px", border: "1px solid #e5e7eb" }}>{row.temperature}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div style={sectionStyle}>
              <h2 style={{ marginTop: 0 }}>현장소통</h2>
              <StatusBox>{communityStatus} 의견 등록 시 입력한 비밀번호로 본인 글을 수정하거나 삭제할 수 있습니다.</StatusBox>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "12px", marginBottom: "12px" }}>
                <Field label="작성자"><input style={inputStyle} value={communityForm.name} onChange={(e) => setCommunityForm({ ...communityForm, name: e.target.value })} placeholder="이름 또는 별칭" /></Field>
                <Field label="장소"><input style={inputStyle} value={communityForm.place} onChange={(e) => setCommunityForm({ ...communityForm, place: e.target.value })} placeholder="현장 위치 또는 대상지" /></Field>
                <Field label="수정용 비밀번호"><input style={inputStyle} type="password" value={communityForm.password} onChange={(e) => setCommunityForm({ ...communityForm, password: e.target.value })} placeholder="글 수정/삭제용" /></Field>
              </div>
              <div style={{ marginBottom: "12px" }}>
                <Field label="내용"><textarea style={textareaStyle} value={communityForm.content} onChange={(e) => setCommunityForm({ ...communityForm, content: e.target.value })} placeholder="현장 의견, 건의사항, 메모 등을 입력하세요." /></Field>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
                <button onClick={handleCommunitySave} style={buttonStyle}>{communityEditId ? "의견 수정 완료" : "의견 등록"}</button>
                {communityEditId ? <button onClick={() => { setCommunityEditId(null); setCommunityForm(emptyCommunityForm); }} style={buttonSecondaryStyle}>수정 취소</button> : null}
              </div>
            </div>

            <div style={sectionStyle}>
              <h2 style={{ marginTop: 0 }}>의견 목록</h2>
              {communityPosts.length === 0 ? (
                <div style={{ color: "#6b7280" }}>아직 등록된 의견이 없습니다.</div>
              ) : communityPosts.map((post, index) => (
                <div key={post.id || index} style={{ background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: "12px", padding: "16px", marginBottom: index === communityPosts.length - 1 ? 0 : "12px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: "10px", flexWrap: "wrap", marginBottom: "8px" }}>
                    <div style={{ fontWeight: 800 }}>{post.name}</div>
                    <div style={{ color: "#6b7280", fontSize: "13px" }}>{post.updatedAt ? `${post.updatedAt} 수정` : post.timestamp}</div>
                  </div>
                  {post.place ? <div style={{ color: "#2563eb", fontSize: "14px", marginBottom: "8px" }}>{post.place}</div> : null}
                  <div style={{ color: "#4b5563", lineHeight: 1.7, whiteSpace: "pre-wrap", marginBottom: "12px" }}>{post.content}</div>
                  <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                    <button onClick={() => startCommunityEdit(post)} style={smallButtonStyle}>수정</button>
                    <button onClick={() => handleCommunityDelete(post)} style={{ ...smallButtonStyle, border: "1px solid #fecaca", background: "#fff1f2" }}>삭제</button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
