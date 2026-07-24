{pkgs}: {
  deps = [
    pkgs.udev
    pkgs.expat
    pkgs.alsa-lib
    pkgs.cairo
    pkgs.pango
    pkgs.libxkbcommon
    pkgs.xorg.libXrandr
    pkgs.xorg.libXfixes
    pkgs.xorg.libXext
    pkgs.xorg.libXdamage
    pkgs.xorg.libXcomposite
    pkgs.xorg.libxcb
    pkgs.xorg.libX11
    pkgs.libgbm
    pkgs.mesa
    pkgs.libdrm
    pkgs.cups
    pkgs.at-spi2-core
    pkgs.dbus
    pkgs.nspr
    pkgs.nss
    pkgs.glib
  ];
}
