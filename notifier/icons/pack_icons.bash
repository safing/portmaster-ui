#/bin/bash

which 2goarray >/dev/null
if [ $? -ne 0 ]; then
  echo "2goarray not installed."
  echo "run to install: go get github.com/cratonica/2goarray"
  exit 1
fi

if [ ! -f "$GOPATH/src/github.com/mattn/go-gtk/tools/make_inline_pixbuf/make_inline_pixbuf.go" ]; then
  echo "github.com/mattn/go-gtk/tools/make_inline_pixbuf not installed."
  echo "run to install: go get github.com/mattn/go-gtk/tools/make_inline_pixbuf"
  exit 1
fi


for entry in $(ls *.png); do

  name=${entry%.png}
  name=${name#icon}
  filename="${name}.go"

  # png byte array
  echo "packging png$filename"
  echo -e "//+build !windows\n" > png$filename
  cat "$entry" | 2goarray ${name}PNG icons >> png$filename
  if [ $? -ne 0 ]; then
    echo "error processing PNG $entry"
    exit
  fi

  # GTK pixbuf
  if [[ $name == "Portmaster256" ]]; then
    echo "packging pb$filename"
    echo -e "//+build linux\n" > pb$filename
    echo "package icons" >> pb$filename
    go run $GOPATH/src/github.com/mattn/go-gtk/tools/make_inline_pixbuf/make_inline_pixbuf.go ${name}PB ${entry} | tail -n +2 >> pb$filename
    if [ $? -ne 0 ]; then
      echo "error processing Pixbuf $entry"
      exit
    fi
  fi



done

for entry in $(ls ../../assets/icons/level_*.ico); do

  name=${entry%.ico}
  name=${name#*/level_}
  name=${name^} # uppercase first character
  filename="${name}.go"

  # ico byte array
  echo "packging ico$filename"
  echo -e "//+build windows\n" > ico$filename
  cat "$entry" | 2goarray ${name}ICO icons >> ico$filename
  if [ $? -ne 0 ]; then
    echo "error processing ICO $entry"
    exit
  fi

done
