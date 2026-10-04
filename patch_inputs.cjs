const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const targetHtml = `              {targetInputs.length > 0 && (
                <div className="mt-4 space-y-2 max-h-40 overflow-y-auto pr-2 custom-scrollbar">
                  {targetInputs.map((num, idx) => {
                    const status = myRequests[num]?.status;
                    let statusText = "";
                    let statusColor = "text-slate-400";
                    if (status === "pending") {
                      statusText = "(قيد الانتظار)";
                      statusColor = "text-yellow-400";
                    } else if (status === "approved") {
                      statusText = "(مقبول)";
                      statusColor = "text-green-400";
                    } else if (status === "rejected") {
                      statusText = "(مرفوض)";
                      statusColor = "text-red-400";
                    }

                    return (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-3 bg-slate-800/50 border border-slate-700/50 rounded-xl animate-in fade-in"
                      >
                        <div className="flex flex-col">
                          <span className="text-slate-200" dir="ltr">
                            {num}
                          </span>
                          {statusText && (
                            <span className={\`text-xs \${statusColor}\`}>
                              {statusText}
                            </span>
                          )}
                        </div>
                        <button
                          onClick={() => handleRemoveNumber(num)}
                          className="text-slate-400 hover:text-red-400 transition-colors bg-slate-900/50 p-2 rounded-lg"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}`;

const searchStr = `{targetInputs.length > 0 && (
                <div className="mt-4 space-y-2 max-h-40 overflow-y-auto pr-2 custom-scrollbar">
                  {targetInputs.map((num, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-3 bg-slate-800/50 border border-slate-700/50 rounded-xl animate-in fade-in"
                    >
                      <span className="text-slate-200" dir="ltr">
                        {num}
                      </span>
                      <button
                        onClick={() => handleRemoveNumber(num)}
                        className="text-slate-400 hover:text-red-400 transition-colors bg-slate-900/50 p-2 rounded-lg"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}`;

code = code.replace(searchStr, targetHtml);
fs.writeFileSync('src/App.tsx', code);
