import Foundation
import Vision
import CoreImage
import AppKit

let args = CommandLine.arguments
guard args.count == 3 else { print("usage: cutout in out"); exit(1) }
let url = URL(fileURLWithPath: args[1])
guard let ci = CIImage(contentsOf: url, options: [.applyOrientationProperty: true]) else { print("load fail"); exit(1) }
let handler = VNImageRequestHandler(ciImage: ci, options: [:])
let req = VNGenerateForegroundInstanceMaskRequest()
do {
  try handler.perform([req])
  guard let obs = req.results?.first else { print("no result"); exit(2) }
  let buf = try obs.generateMaskedImage(ofInstances: obs.allInstances, from: handler, croppedToInstancesExtent: false)
  let out = CIImage(cvPixelBuffer: buf)
  let ctx = CIContext()
  let cs = CGColorSpace(name: CGColorSpace.sRGB)!
  try ctx.writePNGRepresentation(of: out, to: URL(fileURLWithPath: args[2]), format: .RGBA8, colorSpace: cs)
  print("ok", out.extent)
} catch { print("err", error); exit(3) }
