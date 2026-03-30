import React, { useState, useEffect } from "react";
import { initializeApp } from "firebase/app";
import {
  getFirestore,
  collection,
  addDoc,
  query,
  where,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
} from "firebase/firestore";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut,
} from "firebase/auth";

// --- FIREBASE POSTAVKE ---
const firebaseConfig = {
  apiKey: "AIzaSyB9OqvLkGbGTKd4d8l5N-00WG6u2IyE8co",
  authDomain: "logistika-daruvar.firebaseapp.com",
  projectId: "logistika-daruvar",
  storageBucket: "logistika-daruvar.firebasestorage.app",
  messagingSenderId: "759845148847",
  appId: "1:759845148847:web:ba4ed13a84cf9328fc5c5a",
  measurementId: "G-9GC0RKRVP4",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// CSS ZASLUŽAN ZA AUTOMATSKU PRILAGODBU MOBITELU
const responsiveStyles = `
  * { box-sizing: border-box; }
  body { margin: 0; padding: 0; background-color: #f0f2f5; font-family: sans-serif; }
  
  .nav-traka { display: flex; justify-content: center; gap: 15px; flex-wrap: wrap; }
  .nav-gumb { flex: 1; min-width: 140px; text-align: center; }
  
  /* Pravila isključivo za male ekrane (mobitele) */
  @media (max-width: 600px) {
    .admin-zaglavlje { flex-direction: column; align-items: stretch !important; gap: 15px; }
    .admin-zaglavlje h2 { text-align: center; margin: 0; }
    .admin-kontrole { flex-direction: column; align-items: stretch !important; }
    .tablica-kontejner { overflow-x: auto; box-shadow: none; border-radius: 0; }
    .forma-kontejner { width: 100% !important; padding: 15px !important; box-shadow: none !important; border-radius: 0 !important; }
  }
`;

// ==========================================
// 1. DIO: EKRAN ZA VOZAČE
// ==========================================
const OdabirTermina = () => {
  const [odabraniDatum, setOdabraniDatum] = useState("");
  const [terminiZaDan, setTerminiZaDan] = useState([]);
  const [odabraniTermin, setOdabraniTermin] = useState(null);
  const [vrstaUsluge, setVrstaUsluge] = useState("");
  const [ime, setIme] = useState("");
  const [prezime, setPrezime] = useState("");
  const [registracija, setRegistracija] = useState("");
  const [porukaObavijest, setPorukaObavijest] = useState("");
  const [slanjeUTijeku, setSlanjeUTijeku] = useState(false);
  const [ucitavamTermine, setUcitavamTermine] = useState(false);

  const danasnjiDatumStr = new Date().toLocaleDateString("en-CA");

  useEffect(() => {
    const dohvatiZauzeteTermine = async () => {
      if (!odabraniDatum) {
        setTerminiZaDan([]);
        setPorukaObavijest("");
        return;
      }

      const danas = new Date();
      danas.setHours(0, 0, 0, 0);
      const odabrani = new Date(odabraniDatum);
      odabrani.setHours(0, 0, 0, 0);

      if (odabrani < danas) {
        setPorukaObavijest(
          "Ups, vidim da si umoran, molim odabrati ispravan datum 😴"
        );
        setTerminiZaDan([]);
        return;
      }

      if (odabrani.getDay() === 0 || odabrani.getDay() === 6) {
        setPorukaObavijest(
          "Naša logistika vikendom koristi zasluženi odmor, uzmi Staročeško i odmori se 🍻"
        );
        setTerminiZaDan([]);
        return;
      }

      setPorukaObavijest("");
      setUcitavamTermine(true);

      try {
        const upit = query(
          collection(db, "rezervacije_rampa"),
          where("datum", "==", odabraniDatum)
        );
        const rezultati = await getDocs(upit);
        const zauzetaVremena = [];
        rezultati.forEach((dokument) =>
          zauzetaVremena.push(dokument.data().vrijemeTermina)
        );

        const noviTermini = [];
        for (let i = 7; i < 15; i++) {
          const satPocetak = i < 10 ? `0${i}` : i;
          const satKraj = i + 1 < 10 ? `0${i + 1}` : i + 1;
          const formatiranoVrijeme = `${satPocetak}:00 - ${satKraj}:00`;
          noviTermini.push({
            id: `${odabraniDatum}-${i}`,
            vrijeme: formatiranoVrijeme,
            slobodno: !zauzetaVremena.includes(formatiranoVrijeme),
          });
        }
        setTerminiZaDan(noviTermini);
      } catch (error) {
        console.error("Greška:", error);
      } finally {
        setUcitavamTermine(false);
      }
    };

    dohvatiZauzeteTermine();
    setOdabraniTermin(null);
    setVrstaUsluge("");
    setIme("");
    setPrezime("");
    setRegistracija("");
  }, [odabraniDatum]);

  const rezerviraj = async () => {
    if (
      !odabraniTermin ||
      !vrstaUsluge ||
      !ime.trim() ||
      !prezime.trim() ||
      !registracija.trim()
    ) {
      alert("Molimo ispunite sve podatke!");
      return;
    }
    setSlanjeUTijeku(true);
    try {
      await addDoc(collection(db, "rezervacije_rampa"), {
        datum: odabraniDatum,
        vrijemeTermina: odabraniTermin.vrijeme,
        usluga: vrstaUsluge,
        ime: ime.trim(),
        prezime: prezime.trim(),
        vozac: `${ime.trim()} ${prezime.trim()}`,
        registracija: registracija.toUpperCase(),
        status: "Na čekanju",
        vrijemePrijave: new Date().toISOString(),
      });
      alert("Odlično! Rezervacija je uspješno spremljena!");
      const trenutniDatum = odabraniDatum;
      setOdabraniDatum("");
      setTimeout(() => setOdabraniDatum(trenutniDatum), 100);
    } catch (error) {
      alert("Došlo je do greške.");
    } finally {
      setSlanjeUTijeku(false);
    }
  };

  return (
    <div
      className="forma-kontejner"
      style={{
        padding: "20px",
        maxWidth: "400px",
        margin: "auto",
        backgroundColor: "white",
        borderRadius: "8px",
        boxShadow: "0 4px 10px rgba(0,0,0,0.05)",
      }}
    >
      <h2 style={{ textAlign: "center", marginTop: 0 }}>Rezervacija termina</h2>

      <div style={{ marginBottom: "20px" }}>
        <label
          style={{ display: "block", marginBottom: "5px", fontWeight: "bold" }}
        >
          1. Odaberite datum:
        </label>
        <input
          type="date"
          value={odabraniDatum}
          min={danasnjiDatumStr}
          onChange={(e) => setOdabraniDatum(e.target.value)}
          style={{
            padding: "12px",
            width: "100%",
            fontSize: "16px",
            border: "1px solid #ccc",
            borderRadius: "5px",
          }}
        />
      </div>

      {porukaObavijest && (
        <div
          style={{
            padding: "15px",
            backgroundColor: "#fff3cd",
            color: "#856404",
            borderRadius: "5px",
            marginBottom: "20px",
            fontWeight: "bold",
            textAlign: "center",
            fontSize: "16px",
          }}
        >
          {porukaObavijest}
        </div>
      )}
      {ucitavamTermine && (
        <p
          style={{ color: "#008CBA", fontWeight: "bold", textAlign: "center" }}
        >
          Učitavam slobodne termine...
        </p>
      )}

      {odabraniDatum && !porukaObavijest && !ucitavamTermine && (
        <div style={{ marginBottom: "20px" }}>
          <label
            style={{
              display: "block",
              marginBottom: "5px",
              fontWeight: "bold",
            }}
          >
            2. Odaberite slobodan termin:
          </label>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {terminiZaDan.map((termin) => (
              <button
                key={termin.id}
                disabled={!termin.slobodno}
                onClick={() => setOdabraniTermin(termin)}
                style={{
                  padding: "15px",
                  backgroundColor: !termin.slobodno
                    ? "#f44336"
                    : odabraniTermin?.id === termin.id
                    ? "#1b5e20"
                    : "#4CAF50",
                  color: "white",
                  border: "none",
                  borderRadius: "5px",
                  cursor: termin.slobodno ? "pointer" : "not-allowed",
                  display: "flex",
                  justifyContent: "space-between",
                  fontWeight: "bold",
                  fontSize: "16px",
                }}
              >
                <span>{termin.vrijeme}</span>
                <span>
                  {termin.slobodno
                    ? odabraniTermin?.id === termin.id
                      ? "Odabrano ✓"
                      : "Slobodno"
                    : "Zauzeto"}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {odabraniTermin && (
        <div
          style={{
            padding: "15px",
            marginTop: "20px",
            backgroundColor: "#f0f8ff",
            borderRadius: "5px",
            border: "1px solid #cce7ff",
          }}
        >
          <label
            style={{
              display: "block",
              marginBottom: "5px",
              fontWeight: "bold",
            }}
          >
            3. Vrsta usluge:
          </label>
          <select
            value={vrstaUsluge}
            onChange={(e) => setVrstaUsluge(e.target.value)}
            style={{
              display: "block",
              marginBottom: "15px",
              padding: "12px",
              width: "100%",
              fontSize: "16px",
              border: "1px solid #ccc",
              borderRadius: "5px",
            }}
          >
            <option value="" disabled>
              -- Odaberite utovar ili istovar --
            </option>
            <option value="Utovar">Utovar</option>
            <option value="Istovar">Istovar</option>
          </select>
          <label
            style={{
              display: "block",
              marginBottom: "5px",
              fontWeight: "bold",
            }}
          >
            4. Ime vozača:
          </label>
          <input
            type="text"
            placeholder="npr. Ivan"
            value={ime}
            onChange={(e) => setIme(e.target.value)}
            style={{
              display: "block",
              marginBottom: "15px",
              padding: "12px",
              width: "100%",
              fontSize: "16px",
              border: "1px solid #ccc",
              borderRadius: "5px",
            }}
          />
          <label
            style={{
              display: "block",
              marginBottom: "5px",
              fontWeight: "bold",
            }}
          >
            5. Prezime vozača:
          </label>
          <input
            type="text"
            placeholder="npr. Horvat"
            value={prezime}
            onChange={(e) => setPrezime(e.target.value)}
            style={{
              display: "block",
              marginBottom: "15px",
              padding: "12px",
              width: "100%",
              fontSize: "16px",
              border: "1px solid #ccc",
              borderRadius: "5px",
            }}
          />
          <label
            style={{
              display: "block",
              marginBottom: "5px",
              fontWeight: "bold",
            }}
          >
            6. Registracija kamiona:
          </label>
          <input
            type="text"
            placeholder="npr. DA-123-AB"
            value={registracija}
            onChange={(e) => setRegistracija(e.target.value)}
            style={{
              display: "block",
              marginBottom: "15px",
              padding: "12px",
              width: "100%",
              fontSize: "16px",
              border: "1px solid #ccc",
              borderRadius: "5px",
            }}
          />

          <button
            onClick={rezerviraj}
            disabled={slanjeUTijeku}
            style={{
              padding: "15px",
              width: "100%",
              backgroundColor: slanjeUTijeku ? "#888" : "#008CBA",
              color: "white",
              border: "none",
              borderRadius: "5px",
              cursor: slanjeUTijeku ? "wait" : "pointer",
              fontSize: "18px",
              fontWeight: "bold",
              marginTop: "10px",
            }}
          >
            {slanjeUTijeku ? "Spremanje..." : "Potvrdi rezervaciju"}
          </button>
        </div>
      )}
    </div>
  );
};

// ==========================================
// 2. DIO: EKRAN ZA ADMINE
// ==========================================
const AdminPrikaz = ({ odjavaAdmin }) => {
  const [odabraniDatum, setOdabraniDatum] = useState(
    new Date().toLocaleDateString("en-CA")
  );
  const [raspored, setRaspored] = useState([]);
  const [ucitavanje, setUcitavanje] = useState(false);
  const [uredjivanjeId, setUredjivanjeId] = useState(null);
  const [uredjeniPodaci, setUredjeniPodaci] = useState({
    ime: "",
    prezime: "",
    registracija: "",
    usluga: "",
  });

  const dohvatiRaspored = async () => {
    setUcitavanje(true);
    try {
      const upit = query(
        collection(db, "rezervacije_rampa"),
        where("datum", "==", odabraniDatum)
      );
      const rezultati = await getDocs(upit);
      const dohvaceneRezervacije = [];
      rezultati.forEach((d) =>
        dohvaceneRezervacije.push({ bazaId: d.id, ...d.data() })
      );
      const dnevniRaspored = [];
      for (let i = 7; i < 15; i++) {
        const formatiranoVrijeme = `${i < 10 ? `0${i}` : i}:00 - ${
          i + 1 < 10 ? `0${i + 1}` : i + 1
        }:00`;
        const pronadjena = dohvaceneRezervacije.find(
          (r) => r.vrijemeTermina === formatiranoVrijeme
        );
        if (pronadjena) dnevniRaspored.push(pronadjena);
        else
          dnevniRaspored.push({
            vrijemeTermina: formatiranoVrijeme,
            status: "Slobodno",
          });
      }
      setRaspored(dnevniRaspored);
    } catch (e) {
      console.error(e);
    } finally {
      setUcitavanje(false);
    }
  };

  useEffect(() => {
    dohvatiRaspored();
  }, [odabraniDatum]);

  const promijeniStatus = async (bazaId, noviStatus) => {
    try {
      await updateDoc(doc(db, "rezervacije_rampa", bazaId), {
        status: noviStatus,
      });
      dohvatiRaspored();
    } catch (e) {
      alert("Greška.");
    }
  };
  const odbijTermin = async (bazaId) => {
    if (window.confirm("Obrisati ovaj termin?")) {
      try {
        await deleteDoc(doc(db, "rezervacije_rampa", bazaId));
        dohvatiRaspored();
      } catch (e) {
        alert("Greška pri brisanju.");
      }
    }
  };
  const zapocniUredjivanje = (stavka) => {
    setUredjivanjeId(stavka.bazaId);
    setUredjeniPodaci({
      ime: stavka.ime || "",
      prezime: stavka.prezime || "",
      registracija: stavka.registracija || "",
      usluga: stavka.usluga || "",
    });
  };
  const spremiPromjene = async (bazaId) => {
    try {
      await updateDoc(doc(db, "rezervacije_rampa", bazaId), {
        ime: uredjeniPodaci.ime.trim(),
        prezime: uredjeniPodaci.prezime.trim(),
        vozac: `${uredjeniPodaci.ime.trim()} ${uredjeniPodaci.prezime.trim()}`,
        registracija: uredjeniPodaci.registracija.toUpperCase(),
        usluga: uredjeniPodaci.usluga,
      });
      setUredjivanjeId(null);
      dohvatiRaspored();
    } catch (e) {
      alert("Greška pri spremanju.");
    }
  };

  return (
    <div style={{ padding: "20px", maxWidth: "1000px", margin: "auto" }}>
      <div
        className="admin-zaglavlje"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "20px",
        }}
      >
        <h2>Nadzorna ploča - Skladište</h2>
        <button
          onClick={odjavaAdmin}
          style={{
            padding: "10px 15px",
            backgroundColor: "#dc3545",
            color: "white",
            border: "none",
            borderRadius: "5px",
            cursor: "pointer",
            fontWeight: "bold",
            fontSize: "16px",
          }}
        >
          Zaključaj 🔒
        </button>
      </div>

      <div
        className="admin-kontrole"
        style={{
          marginBottom: "20px",
          backgroundColor: "#fff",
          padding: "15px",
          borderRadius: "8px",
          display: "flex",
          alignItems: "center",
          gap: "15px",
          boxShadow: "0 2px 5px rgba(0,0,0,0.05)",
        }}
      >
        <label style={{ fontWeight: "bold" }}>Pregled rasporeda za dan:</label>
        <input
          type="date"
          value={odabraniDatum}
          onChange={(e) => setOdabraniDatum(e.target.value)}
          style={{
            padding: "10px",
            fontSize: "16px",
            borderRadius: "5px",
            border: "1px solid #ccc",
            flex: 1,
          }}
        />
        {ucitavanje && (
          <span style={{ color: "#008CBA", fontWeight: "bold" }}>
            Učitavanje...
          </span>
        )}
      </div>

      {/* KLJUČNO ZA MOBITELE: div s tablica-kontejner klasom omogućuje vodoravno listanje tablice */}
      <div
        className="tablica-kontejner"
        style={{
          backgroundColor: "#fff",
          borderRadius: "8px",
          boxShadow: "0 4px 10px rgba(0,0,0,0.05)",
        }}
      >
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            minWidth: "800px",
          }}
        >
          <thead>
            <tr
              style={{
                backgroundColor: "#333",
                color: "white",
                textAlign: "left",
              }}
            >
              <th style={{ padding: "15px" }}>Termin</th>
              <th style={{ padding: "15px" }}>Usluga</th>
              <th style={{ padding: "15px" }}>Vozač</th>
              <th style={{ padding: "15px" }}>Status</th>
              <th style={{ padding: "15px" }}>Akcije</th>
            </tr>
          </thead>
          <tbody>
            {raspored.map((s, i) => {
              const jelSeUredjuje = uredjivanjeId === s.bazaId;
              return (
                <tr
                  key={i}
                  style={{
                    borderBottom: "1px solid #eee",
                    backgroundColor:
                      s.status === "Slobodno" ? "#fafafa" : "#fff",
                  }}
                >
                  <td
                    style={{
                      padding: "15px",
                      fontWeight: "bold",
                      borderRight: "1px solid #eee",
                    }}
                  >
                    {s.vrijemeTermina}
                  </td>
                  <td
                    style={{
                      padding: "15px",
                      fontWeight: "bold",
                      color: s.usluga === "Utovar" ? "#d32f2f" : "#1976d2",
                    }}
                  >
                    {jelSeUredjuje ? (
                      <select
                        value={uredjeniPodaci.usluga}
                        onChange={(e) =>
                          setUredjeniPodaci({
                            ...uredjeniPodaci,
                            usluga: e.target.value,
                          })
                        }
                        style={{ padding: "8px", width: "100%" }}
                      >
                        <option value="Utovar">Utovar</option>
                        <option value="Istovar">Istovar</option>
                      </select>
                    ) : (
                      s.usluga || "-"
                    )}
                  </td>
                  <td style={{ padding: "15px" }}>
                    {s.status !== "Slobodno" ? (
                      jelSeUredjuje ? (
                        <div
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: "8px",
                          }}
                        >
                          <input
                            type="text"
                            value={uredjeniPodaci.ime}
                            onChange={(e) =>
                              setUredjeniPodaci({
                                ...uredjeniPodaci,
                                ime: e.target.value,
                              })
                            }
                            placeholder="Ime"
                            style={{ padding: "8px" }}
                          />
                          <input
                            type="text"
                            value={uredjeniPodaci.prezime}
                            onChange={(e) =>
                              setUredjeniPodaci({
                                ...uredjeniPodaci,
                                prezime: e.target.value,
                              })
                            }
                            placeholder="Prezime"
                            style={{ padding: "8px" }}
                          />
                          <input
                            type="text"
                            value={uredjeniPodaci.registracija}
                            onChange={(e) =>
                              setUredjeniPodaci({
                                ...uredjeniPodaci,
                                registracija: e.target.value,
                              })
                            }
                            placeholder="Registracija"
                            style={{ padding: "8px" }}
                          />
                        </div>
                      ) : (
                        <div>
                          <div style={{ fontWeight: "bold", fontSize: "16px" }}>
                            {s.vozac}
                          </div>
                          <div
                            style={{
                              fontSize: "14px",
                              color: "#666",
                              marginTop: "4px",
                            }}
                          >
                            Reg: {s.registracija}
                          </div>
                        </div>
                      )
                    ) : (
                      <span style={{ color: "#aaa" }}>Nema najave</span>
                    )}
                  </td>
                  <td style={{ padding: "15px" }}>
                    <span
                      style={{
                        padding: "8px 12px",
                        borderRadius: "20px",
                        fontWeight: "bold",
                        fontSize: "13px",
                        backgroundColor:
                          s.status === "Slobodno"
                            ? "#e0e0e0"
                            : s.status === "Na čekanju"
                            ? "#fff3cd"
                            : s.status === "U tijeku"
                            ? "#cce5ff"
                            : "#d4edda",
                        color:
                          s.status === "Slobodno"
                            ? "#666"
                            : s.status === "Na čekanju"
                            ? "#856404"
                            : s.status === "U tijeku"
                            ? "#004085"
                            : "#155724",
                      }}
                    >
                      {s.status}
                    </span>
                  </td>
                  <td style={{ padding: "15px" }}>
                    {s.status !== "Slobodno" && (
                      <div
                        style={{
                          display: "flex",
                          flexWrap: "wrap",
                          gap: "8px",
                        }}
                      >
                        {jelSeUredjuje ? (
                          <>
                            <button
                              onClick={() => spremiPromjene(s.bazaId)}
                              style={{
                                padding: "8px 12px",
                                backgroundColor: "#28a745",
                                color: "white",
                                border: "none",
                                borderRadius: "5px",
                                cursor: "pointer",
                                fontWeight: "bold",
                              }}
                            >
                              Spremi
                            </button>
                            <button
                              onClick={() => setUredjivanjeId(null)}
                              style={{
                                padding: "8px 12px",
                                backgroundColor: "#6c757d",
                                color: "white",
                                border: "none",
                                borderRadius: "5px",
                                cursor: "pointer",
                                fontWeight: "bold",
                              }}
                            >
                              Odustani
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => zapocniUredjivanje(s)}
                              style={{
                                padding: "8px 12px",
                                backgroundColor: "#ffc107",
                                color: "#000",
                                border: "none",
                                borderRadius: "5px",
                                cursor: "pointer",
                                fontWeight: "bold",
                              }}
                            >
                              Uredi ✏️
                            </button>
                            <button
                              onClick={() => odbijTermin(s.bazaId)}
                              style={{
                                padding: "8px 12px",
                                backgroundColor: "#dc3545",
                                color: "white",
                                border: "none",
                                borderRadius: "5px",
                                cursor: "pointer",
                                fontWeight: "bold",
                              }}
                            >
                              Odbij ❌
                            </button>
                          </>
                        )}
                        {!jelSeUredjuje && s.status === "Na čekanju" && (
                          <button
                            onClick={() =>
                              promijeniStatus(s.bazaId, "U tijeku")
                            }
                            style={{
                              padding: "8px 12px",
                              backgroundColor: "#007bff",
                              color: "white",
                              border: "none",
                              borderRadius: "5px",
                              cursor: "pointer",
                              fontWeight: "bold",
                            }}
                          >
                            Započni
                          </button>
                        )}
                        {!jelSeUredjuje && s.status === "U tijeku" && (
                          <button
                            onClick={() =>
                              promijeniStatus(s.bazaId, "Završeno")
                            }
                            style={{
                              padding: "8px 12px",
                              backgroundColor: "#28a745",
                              color: "white",
                              border: "none",
                              borderRadius: "5px",
                              cursor: "pointer",
                              fontWeight: "bold",
                            }}
                          >
                            Završi
                          </button>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ==========================================
// 3. DIO: GLAVNA APLIKACIJA (Prijava + Navigacija)
// ==========================================
const App = () => {
  const [korisnik, setKorisnik] = useState(null);
  const [emailKorisnika, setEmailKorisnika] = useState("");
  const [lozinkaKorisnika, setLozinkaKorisnika] = useState("");
  const [jeRegistracija, setJeRegistracija] = useState(false);

  useEffect(() => {
    const odjavaSlusanja = onAuthStateChanged(auth, (trenutniKorisnik) =>
      setKorisnik(trenutniKorisnik)
    );
    return () => odjavaSlusanja();
  }, []);

  const upravljajPrijavom = async () => {
    if (!emailKorisnika || !lozinkaKorisnika) {
      alert("Unesite e-mail i lozinku!");
      return;
    }
    try {
      if (jeRegistracija) {
        await createUserWithEmailAndPassword(
          auth,
          emailKorisnika,
          lozinkaKorisnika
        );
        alert("Račun je uspješno kreiran!");
      } else {
        await signInWithEmailAndPassword(
          auth,
          emailKorisnika,
          lozinkaKorisnika
        );
      }
    } catch (error) {
      alert(
        "Došlo je do greške. Provjerite podatke ili lozinku (min. 6 znakova)."
      );
    }
  };

  const [aktivniEkran, setAktivniEkran] = useState("vozaci");
  const [adminPrijavljen, setAdminPrijavljen] = useState(false);
  const [adminLozinka, setAdminLozinka] = useState("");
  const provjeriAdminLozinku = () => {
    if (adminLozinka === "daruvar2026") {
      setAdminPrijavljen(true);
      setAdminLozinka("");
    } else {
      alert("Netočna lozinka!");
      setAdminLozinka("");
    }
  };

  if (!korisnik) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "100vh",
        }}
      >
        <style>{responsiveStyles}</style>
        <div
          className="forma-kontejner"
          style={{
            backgroundColor: "white",
            padding: "40px 30px",
            borderRadius: "10px",
            boxShadow: "0 4px 15px rgba(0,0,0,0.1)",
            width: "100%",
            maxWidth: "380px",
            textAlign: "center",
          }}
        >
          <h2 style={{ color: "#333", marginBottom: "10px", marginTop: 0 }}>
            Logistika Daruvar
          </h2>
          <p style={{ color: "#666", marginBottom: "30px" }}>
            {jeRegistracija
              ? "Registrirajte novi račun"
              : "Prijavite se za nastavak"}
          </p>

          <input
            type="email"
            placeholder="Vaš E-mail"
            value={emailKorisnika}
            onChange={(e) => setEmailKorisnika(e.target.value)}
            style={{
              width: "100%",
              padding: "15px",
              marginBottom: "15px",
              border: "1px solid #ccc",
              borderRadius: "5px",
              fontSize: "16px",
            }}
          />
          <input
            type="password"
            placeholder="Lozinka (min. 6 znakova)"
            value={lozinkaKorisnika}
            onChange={(e) => setLozinkaKorisnika(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && upravljajPrijavom()}
            style={{
              width: "100%",
              padding: "15px",
              marginBottom: "20px",
              border: "1px solid #ccc",
              borderRadius: "5px",
              fontSize: "16px",
            }}
          />

          <button
            onClick={upravljajPrijavom}
            style={{
              width: "100%",
              padding: "15px",
              backgroundColor: "#008CBA",
              color: "white",
              border: "none",
              borderRadius: "5px",
              fontWeight: "bold",
              cursor: "pointer",
              fontSize: "18px",
            }}
          >
            {jeRegistracija ? "Registriraj se" : "Prijavi se"}
          </button>
          <p style={{ marginTop: "25px", fontSize: "15px", color: "#555" }}>
            {jeRegistracija ? "Već imate račun?" : "Nemate račun?"}{" "}
            <span
              onClick={() => setJeRegistracija(!jeRegistracija)}
              style={{
                color: "#008CBA",
                fontWeight: "bold",
                cursor: "pointer",
              }}
            >
              {jeRegistracija ? "Prijavite se" : "Registrirajte se"}
            </span>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <style>{responsiveStyles}</style>
      <div
        style={{
          backgroundColor: "#111",
          color: "#ccc",
          padding: "12px 20px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          fontSize: "14px",
          flexWrap: "wrap",
          gap: "10px",
        }}
      >
        <span>
          Prijavljeni ste kao:{" "}
          <b style={{ color: "white" }}>{korisnik.email}</b>
        </span>
        <button
          onClick={() => signOut(auth)}
          style={{
            backgroundColor: "transparent",
            color: "#ff4d4d",
            border: "1px solid #ff4d4d",
            padding: "6px 12px",
            borderRadius: "4px",
            cursor: "pointer",
            fontWeight: "bold",
          }}
        >
          Odjava
        </button>
      </div>

      <nav
        className="nav-traka"
        style={{
          backgroundColor: "#222",
          padding: "15px 20px",
          boxShadow: "0 4px 6px rgba(0,0,0,0.2)",
        }}
      >
        <button
          className="nav-gumb"
          onClick={() => setAktivniEkran("vozaci")}
          style={{
            padding: "12px 20px",
            fontSize: "16px",
            fontWeight: "bold",
            cursor: "pointer",
            border: "none",
            borderRadius: "5px",
            backgroundColor: aktivniEkran === "vozaci" ? "#4CAF50" : "#444",
            color: "white",
          }}
        >
          🚛 Portal za vozače
        </button>
        <button
          className="nav-gumb"
          onClick={() => setAktivniEkran("admin")}
          style={{
            padding: "12px 20px",
            fontSize: "16px",
            fontWeight: "bold",
            cursor: "pointer",
            border: "none",
            borderRadius: "5px",
            backgroundColor: aktivniEkran === "admin" ? "#008CBA" : "#444",
            color: "white",
          }}
        >
          📦 Skladište
        </button>
      </nav>

      <div style={{ padding: "20px 10px" }}>
        {aktivniEkran === "vozaci" && <OdabirTermina />}

        {aktivniEkran === "admin" && !adminPrijavljen && (
          <div
            className="forma-kontejner"
            style={{
              maxWidth: "350px",
              margin: "40px auto",
              padding: "30px",
              border: "1px solid #ccc",
              borderRadius: "8px",
              backgroundColor: "#fff",
              textAlign: "center",
              boxShadow: "0 4px 15px rgba(0,0,0,0.05)",
            }}
          >
            <h3 style={{ marginTop: 0 }}>🔒 Zaštićeno područje</h3>
            <p
              style={{ fontSize: "15px", color: "#666", marginBottom: "20px" }}
            >
              PIN za skladište:
            </p>
            <input
              type="password"
              value={adminLozinka}
              onChange={(e) => setAdminLozinka(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && provjeriAdminLozinku()}
              style={{
                padding: "12px",
                width: "100%",
                boxSizing: "border-box",
                marginBottom: "20px",
                border: "1px solid #aaa",
                borderRadius: "5px",
                fontSize: "16px",
                textAlign: "center",
              }}
            />
            <button
              onClick={provjeriAdminLozinku}
              style={{
                padding: "15px",
                width: "100%",
                backgroundColor: "#008CBA",
                color: "white",
                border: "none",
                borderRadius: "5px",
                cursor: "pointer",
                fontWeight: "bold",
                fontSize: "18px",
              }}
            >
              Otključaj
            </button>
          </div>
        )}

        {aktivniEkran === "admin" && adminPrijavljen && (
          <AdminPrikaz odjavaAdmin={() => setAdminPrijavljen(false)} />
        )}
      </div>
    </div>
  );
};

export default App;
