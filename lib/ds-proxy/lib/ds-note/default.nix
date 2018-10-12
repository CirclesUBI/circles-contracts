{ solidityPackage, dappsys }: solidityPackage {
  name = "ds-note";
  deps = with dappsys; [ds-test];
  src = ./src;
}
