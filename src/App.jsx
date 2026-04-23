import React, { useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";

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
};

const textareaStyle = {
  ...inputStyle,
  minHeight: "120px",
  resize: "vertical",
};

const buttonStyle = {
  padding: "10px 14px",
  borderRadius: "10px",
  border: "1px solid #c7d2fe",
  background: "#eef2ff",
  cursor: "pointer",
  fontWeight: 600,
};

const buttonSecondaryStyle = {
  padding: "10px 14px",
  borderRadius: "10px",
  border: "1px solid #d1d5db",
  background: "#ffffff",
  cursor: "pointer",
  fontWeight: 600,
};

const tabs = [
  { key: "notice", label: "공지사항" },
  { key: "tree", label: "수목활력" },
  { key: "soil", label: "토양측정" },
  { key: "community", label: "현장소통" },
];

const defaultNotices = [
  {
    title: "퍼니어캔의 현장조사 야장 SET 안내",
    date: "2026-04-24",
    content:
      "현재 탭 구성은 공지사항, 수목활력, 토양측정, 현장소통 순입니다. 현장 입력 데이터는 브라우저에 임시저장되며 CSV와 엑셀로 내려받을 수 있습니다.",
  },
];

export default function App() {
  const [tab, setTab] = useState("notice");
  const [treeForm, setTreeForm] = useState({
    number: "",
    measure1: "",
    measure2: "",
    measure3: "",
    measure4: "",
  });
  const [soilForm, setSoilForm] = useState({
    number: "",
    place: "",
    moisture: "",
    ec: "",
    temperature: "",
  });
  const [communityForm, setCommunityForm] = useState({ name: "", place: "", content: "" });

  const [treeData, setTreeData] = useState([]);
  const [soilData, setSoilData] = useState([]);
  const [communityPosts, setCommunityPosts] = useState([]);
  const [communityStatus, setCommunityStatus] = useState("저장된 의견을 불러오는 중입니다.");
  const [visitStats, setVisitStats] = useState({ today: "불러오는 중", total: "불러오는 중" });

  useEffect(() => {
    try {
      const savedTree = localStorage.getItem("field_sheet_tree_data");
      const savedSoil = localStorage.getItem("field_sheet_soil_data");
      if (savedTree) setTreeData(JSON.parse(savedTree));
      if (savedSoil) setSoilData(JSON.parse(savedSoil));
    } catch (error) {
      console.error(error);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("field_sheet_tree_data", JSON.stringify(treeData));
  }, [treeData]);

  useEffect(() => {
    localStorage.setItem("field_sheet_soil_data", JSON.stringify(soilData));
  }, [soilData]);

  useEffect(() => {
    const fetchCommunityPosts = async () => {
      try {
        const response = await fetch("/.netlify/functions/community-posts", { method: "GET" });
        if (!response.ok) throw new Error("community posts failed");
        const data = await response.json();
        setCommunityPosts(Array.isArray(data.posts) ? data.posts : []);
        setCommunityStatus("저장된 의견을 불러왔습니다.");
      } catch (error) {
        console.error(error);
        setCommunityStatus("게시판 저장소 연결을 확인해주세요. 현재 화면에서는 임시 목록만 보일 수 있습니다.");
      }
    };

    fetchCommunityPosts();
  }, []);

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

  const treeRows = useMemo(() => {
    return treeData.map((item) => {
      const nums = [item.measure1, item.measure2, item.measure3, item.measure4]
        .map((v) => Number(v))
        .filter((v) => !Number.isNaN(v));
      const average = nums.length ? (nums.reduce((sum, cur) => sum + cur, 0) / nums.length).toFixed(2) : "";
      return { ...item, average };
    });
  }, [treeData]);

  const soilRows = useMemo(() => soilData.map((item) => ({ ...item })), [soilData]);

  const notices = defaultNotices;

  const handleTreeAdd = () => {
    if (!treeForm.number) return alert("번호를 입력해주세요.");
    setTreeData((prev) => [...prev, { ...treeForm }]);
    setTreeForm({ number: "", measure1: "", measure2: "", measure3: "", measure4: "" });
  };

  const handleSoilAdd = () => {
    if (!soilForm.number) return alert("번호를 입력해주세요.");
    if (!soilForm.moisture && !soilForm.ec && !soilForm.temperature) return alert("토양 측정값을 입력해주세요.");
    setSoilData((prev) => [...prev, { ...soilForm }]);
    setSoilForm({ number: "", place: "", moisture: "", ec: "", temperature: "" });
  };

  const handleCommunityAdd = async () => {
    if (!communityForm.name || !communityForm.content) {
      alert("작성자와 내용을 입력해주세요.");
      return;
    }

    setCommunityStatus("의견을 저장하는 중입니다.");

    try {
      const response = await fetch("/.netlify/functions/community-posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(communityForm),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok || data.ok === false) {
        throw new Error(data.error || "의견 저장에 실패했습니다.");
      }

      setCommunityPosts(Array.isArray(data.posts) ? data.posts : []);
      setCommunityForm({ name: "", place: "", content: "" });
      setCommunityStatus("의견이 저장되었습니다. 다른 접속자도 이 목록을 볼 수 있습니다.");
    } catch (error) {
      console.error(error);
      setCommunityStatus("저장소 연결 실패: Netlify Functions/Blobs 설정 또는 배포 로그를 확인해주세요.");
      alert(error?.message || "의견 저장에 실패했습니다.");
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: "#f3f4f6", padding: "24px", color: "#111827" }}>
      <div style={{ maxWidth: "1100px", margin: "0 auto" }}>
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
            공지사항, 수목활력, 토양측정, 현장소통 탭으로 구성되어 있습니다. 수목활력과 토양측정 데이터는 브라우저에 자동 임시저장되며 CSV 또는 엑셀로 내려받을 수 있습니다. 현장소통 의견은 서버 저장소에 저장됩니다.
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
          <div style={sectionStyle}>
            <h2 style={{ marginTop: 0 }}>공지사항</h2>
            {notices.map((notice, index) => (
              <div key={index} style={{ background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: "12px", padding: "16px", marginBottom: index === notices.length - 1 ? 0 : "12px" }}>
                <div style={{ fontWeight: 700, marginBottom: "6px" }}>{notice.title}</div>
                <div style={{ fontSize: "13px", color: "#6b7280", marginBottom: "8px" }}>{notice.date}</div>
                <div style={{ color: "#4b5563", lineHeight: 1.7 }}>{notice.content}</div>
              </div>
            ))}
          </div>
        )}

        {tab === "tree" && (
          <>
            <div style={sectionStyle}>
              <h2 style={{ marginTop: 0 }}>수목활력 입력</h2>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "12px", marginBottom: "16px" }}>
                <div><label>번호</label><input style={inputStyle} value={treeForm.number} onChange={(e) => setTreeForm({ ...treeForm, number: e.target.value })} placeholder="예: 1" /></div>
                <div><label>1번측정</label><input style={inputStyle} type="number" step="any" value={treeForm.measure1} onChange={(e) => setTreeForm({ ...treeForm, measure1: e.target.value })} /></div>
                <div><label>2번측정</label><input style={inputStyle} type="number" step="any" value={treeForm.measure2} onChange={(e) => setTreeForm({ ...treeForm, measure2: e.target.value })} /></div>
                <div><label>3번측정</label><input style={inputStyle} type="number" step="any" value={treeForm.measure3} onChange={(e) => setTreeForm({ ...treeForm, measure3: e.target.value })} /></div>
                <div><label>4번측정</label><input style={inputStyle} type="number" step="any" value={treeForm.measure4} onChange={(e) => setTreeForm({ ...treeForm, measure4: e.target.value })} /></div>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
                <button onClick={handleTreeAdd} style={buttonStyle}>데이터 추가</button>
                <button onClick={() => downloadCSV("수목활력_전자야장.csv", treeRows)} style={buttonSecondaryStyle}>CSV 저장</button>
                <button onClick={() => downloadExcel("수목활력_전자야장.xlsx", treeRows, "수목활력")} style={buttonSecondaryStyle}>엑셀 저장</button>
                <button onClick={() => { if (window.confirm("수목활력 데이터를 모두 비우시겠습니까?")) { setTreeData([]); localStorage.removeItem("field_sheet_tree_data"); } }} style={buttonSecondaryStyle}>전체 비우기</button>
              </div>
            </div>
            <div style={sectionStyle}>
              <h2 style={{ marginTop: 0 }}>수목활력 데이터 목록</h2>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", background: "#fff" }}>
                  <thead><tr style={{ background: "#e5e7eb" }}>
                    {['번호','1번측정','2번측정','3번측정','4번측정','평균','삭제'].map(h => <th key={h} style={{ padding: '10px', border: '1px solid #d1d5db' }}>{h}</th>)}
                  </tr></thead>
                  <tbody>
                    {treeRows.length === 0 ? <tr><td colSpan="7" style={{ padding: '14px', border: '1px solid #d1d5db', textAlign: 'center' }}>아직 입력된 데이터가 없습니다.</td></tr> : treeRows.map((row, index) => (
                      <tr key={`${row.number}-${index}`}>
                        <td style={{ padding: '10px', border: '1px solid #d1d5db' }}>{row.number}</td>
                        <td style={{ padding: '10px', border: '1px solid #d1d5db' }}>{row.measure1}</td>
                        <td style={{ padding: '10px', border: '1px solid #d1d5db' }}>{row.measure2}</td>
                        <td style={{ padding: '10px', border: '1px solid #d1d5db' }}>{row.measure3}</td>
                        <td style={{ padding: '10px', border: '1px solid #d1d5db' }}>{row.measure4}</td>
                        <td style={{ padding: '10px', border: '1px solid #d1d5db', fontWeight: 700 }}>{row.average}</td>
                        <td style={{ padding: '10px', border: '1px solid #d1d5db' }}><button onClick={() => setTreeData((prev) => prev.filter((_, i) => i !== index))} style={buttonSecondaryStyle}>삭제</button></td>
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
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "12px", marginBottom: "16px" }}>
                <div><label>번호</label><input style={inputStyle} value={soilForm.number} onChange={(e) => setSoilForm({ ...soilForm, number: e.target.value })} placeholder="예: 1" /></div>
                <div><label>장소</label><input style={inputStyle} value={soilForm.place} onChange={(e) => setSoilForm({ ...soilForm, place: e.target.value })} placeholder="예: A지점, 화단1" /></div>
                <div><label>토양수분</label><input style={inputStyle} type="number" step="any" value={soilForm.moisture} onChange={(e) => setSoilForm({ ...soilForm, moisture: e.target.value })} /></div>
                <div><label>EC</label><input style={inputStyle} type="number" step="any" value={soilForm.ec} onChange={(e) => setSoilForm({ ...soilForm, ec: e.target.value })} /></div>
                <div><label>토양온도</label><input style={inputStyle} type="number" step="any" value={soilForm.temperature} onChange={(e) => setSoilForm({ ...soilForm, temperature: e.target.value })} /></div>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
                <button onClick={handleSoilAdd} style={buttonStyle}>데이터 추가</button>
                <button onClick={() => downloadCSV("토양측정_전자야장.csv", soilRows)} style={buttonSecondaryStyle}>CSV 저장</button>
                <button onClick={() => downloadExcel("토양측정_전자야장.xlsx", soilRows, "토양측정")} style={buttonSecondaryStyle}>엑셀 저장</button>
                <button onClick={() => { if (window.confirm("토양측정 데이터를 모두 비우시겠습니까?")) { setSoilData([]); localStorage.removeItem("field_sheet_soil_data"); } }} style={buttonSecondaryStyle}>전체 비우기</button>
              </div>
            </div>
            <div style={sectionStyle}>
              <h2 style={{ marginTop: 0 }}>토양측정 데이터 목록</h2>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", background: "#fff" }}>
                  <thead><tr style={{ background: "#e5e7eb" }}>
                    {['번호','장소','토양수분','EC','토양온도','삭제'].map(h => <th key={h} style={{ padding: '10px', border: '1px solid #d1d5db' }}>{h}</th>)}
                  </tr></thead>
                  <tbody>
                    {soilRows.length === 0 ? <tr><td colSpan="6" style={{ padding: '14px', border: '1px solid #d1d5db', textAlign: 'center' }}>아직 입력된 데이터가 없습니다.</td></tr> : soilRows.map((row, index) => (
                      <tr key={index}>
                        <td style={{ padding: '10px', border: '1px solid #d1d5db' }}>{row.number}</td>
                        <td style={{ padding: '10px', border: '1px solid #d1d5db' }}>{row.place}</td>
                        <td style={{ padding: '10px', border: '1px solid #d1d5db' }}>{row.moisture}</td>
                        <td style={{ padding: '10px', border: '1px solid #d1d5db' }}>{row.ec}</td>
                        <td style={{ padding: '10px', border: '1px solid #d1d5db' }}>{row.temperature}</td>
                        <td style={{ padding: '10px', border: '1px solid #d1d5db' }}><button onClick={() => setSoilData((prev) => prev.filter((_, i) => i !== index))} style={buttonSecondaryStyle}>삭제</button></td>
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
              <h2 style={{ marginTop: 0 }}>현장소통</h2>
              <div style={{ color: "#4b5563", background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: "10px", padding: "10px 12px", marginBottom: "12px" }}>{communityStatus}</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "12px", marginBottom: "12px" }}>
                <div><label>작성자</label><input style={inputStyle} value={communityForm.name} onChange={(e) => setCommunityForm({ ...communityForm, name: e.target.value })} placeholder="이름 또는 별칭" /></div>
                <div><label>장소</label><input style={inputStyle} value={communityForm.place} onChange={(e) => setCommunityForm({ ...communityForm, place: e.target.value })} placeholder="현장 위치 또는 대상지" /></div>
              </div>
              <div style={{ marginBottom: '12px' }}><label>내용</label><textarea style={textareaStyle} value={communityForm.content} onChange={(e) => setCommunityForm({ ...communityForm, content: e.target.value })} placeholder="현장 의견, 건의사항, 메모 등을 입력하세요." /></div>
              <button onClick={handleCommunityAdd} style={buttonStyle}>의견 등록</button>
            </div>
            <div style={sectionStyle}>
              <h2 style={{ marginTop: 0 }}>의견 목록</h2>
              {communityPosts.length === 0 ? (
                <div style={{ color: '#6b7280' }}>아직 등록된 의견이 없습니다.</div>
              ) : communityPosts.map((post, index) => (
                <div key={index} style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '16px', marginBottom: index === communityPosts.length - 1 ? 0 : '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap', marginBottom: '8px' }}>
                    <div style={{ fontWeight: 700 }}>{post.name}</div>
                    <div style={{ color: '#6b7280', fontSize: '13px' }}>{post.timestamp}</div>
                  </div>
                  {post.place ? <div style={{ color: '#2563eb', fontSize: '14px', marginBottom: '8px' }}>{post.place}</div> : null}
                  <div style={{ color: '#4b5563', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{post.content}</div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
