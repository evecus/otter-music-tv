/**
 * TVSidebar — Android TV 左侧导航栏
 *
 * 替代手机端的底部 TabBar。
 * 支持遥控器方向键 + Enter 导航。
 */

import { Link, useLocation } from "react-router-dom";
import { Search, Heart, User, Tv2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItem {
  id: string;
  label: string;
  icon: typeof Search;
  path: string;
}

const NAV_ITEMS: NavItem[] = [
  { id: "search",    label: "发现",  icon: Search, path: "/search" },
  { id: "favorites", label: "喜欢",  icon: Heart,  path: "/favorites" },
  { id: "mine",      label: "我的",  icon: User,   path: "/mine" },
];

export function TVSidebar() {
  const { pathname } = useLocation();

  return (
    <aside className="tv-sidebar" role="navigation" aria-label="主导航">
      {/* Logo */}
      <div className="tv-sidebar__logo">
        <Tv2 size={24} />
        <span>水獭音乐</span>
      </div>

      {/* 导航项 */}
      <nav className="flex flex-col">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname.startsWith(item.path);
          const Icon = item.icon;
          return (
            <Link
              key={item.id}
              to={item.path}
              className={cn("tv-nav-item", isActive && "active")}
              tabIndex={0}
              aria-current={isActive ? "page" : undefined}
              data-tv-focusable
            >
              <Icon className="tv-nav-item__icon" strokeWidth={isActive ? 2.5 : 2} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
