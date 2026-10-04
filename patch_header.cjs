const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const bellHtml = `          {/* Notification Bell */}
          <div className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="flex items-center gap-2 p-2 text-slate-500 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer relative"
              title="الإشعارات"
            >
              <Bell className="w-5 h-5" />
              {incomingRequests.length > 0 && (
                <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-slate-950"></span>
              )}
            </button>
            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl z-50 overflow-hidden" dir="auto">
                <div className="p-4 border-b border-slate-800 bg-slate-900/50">
                  <h3 className="font-bold text-white">طلبات المتابعة ({incomingRequests.length})</h3>
                </div>
                <div className="max-h-64 overflow-y-auto custom-scrollbar">
                  {incomingRequests.length === 0 ? (
                    <div className="p-4 text-center text-sm text-slate-500">
                      لا توجد طلبات متابعة حالياً
                    </div>
                  ) : (
                    incomingRequests.map((req, idx) => (
                      <div key={idx} className="p-4 border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                        <div className="flex items-center justify-between gap-3 mb-2">
                          <div>
                            <p className="text-sm font-semibold text-white">{req.requesterName || 'مستخدم'}</p>
                            <p className="text-xs text-slate-400" dir="ltr">{req.phone}</p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleApprove(req.phone)}
                            className="flex-1 py-1.5 px-3 bg-indigo-500 hover:bg-indigo-400 text-white text-xs font-medium rounded-lg transition-colors"
                          >
                            موافقة
                          </button>
                          <button
                            onClick={() => handleReject(req.phone)}
                            className="flex-1 py-1.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-lg transition-colors"
                          >
                            رفض
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
          {onOpenSettings && (`;

code = code.replace('{onOpenSettings && (', bellHtml);
fs.writeFileSync('src/App.tsx', code);
